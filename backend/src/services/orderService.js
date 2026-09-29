import Food from '../models/Food.js';
import Subscription from '../models/Subscription.js';
import mongoose from 'mongoose';
import { validateAndCalculateCoupon } from './couponService.js';
import {
  findSubscriptionPlan,
  getISTDateString
} from '../config/subscriptionPlans.js';

/**
 * Validates cart items against MongoDB database, fetches true item prices,
 * calculates subtotal, checks Dining Club subscription discount eligibility,
 * computes milestone coupons, handles promo coupons, and enforces stacking limits.
 */
export const calculateOrderPricing = async ({ items, user, couponCode }) => {
  if (!items || !Array.isArray(items) || items.length === 0) {
    const error = new Error('Order must contain at least one item');
    error.statusCode = 400;
    throw error;
  }

  const verifiedItems = [];
  let subtotal = 0;

  for (const item of items) {
    const quantity = parseInt(item.quantity, 10);
    if (isNaN(quantity) || quantity <= 0) {
      const error = new Error(`Invalid quantity for item ${item.name || item.foodId}`);
      error.statusCode = 400;
      throw error;
    }

    // Validate foodId is a valid MongoDB ObjectID
    const foodId = item.foodId;
    if (!foodId || !mongoose.Types.ObjectId.isValid(foodId)) {
      const error = new Error(`Invalid food ID format: ${foodId}. Please refresh the menu and try again.`);
      error.statusCode = 400;
      throw error;
    }

    const food = await Food.findById(foodId);
    if (!food) {
      const error = new Error(`Food item with ID ${foodId} was not found. It may have been removed from the menu.`);
      error.statusCode = 404;
      throw error;
    }

    if (!food.isAvailable || (food.stockCount !== undefined && food.stockCount <= 0)) {
      const error = new Error(`This item is currently out of stock: "${food.name}"`);
      error.statusCode = 400;
      throw error;
    }

    if (food.stockCount !== undefined && food.stockCount < quantity) {
      const error = new Error(
        `Item "${food.name}" only has ${food.stockCount} left in stock (you requested ${quantity}). Please adjust your cart.`
      );
      error.statusCode = 400;
      throw error;
    }

    const lineTotal = food.price * quantity;
    subtotal += lineTotal;

    verifiedItems.push({
      foodId: food._id,
      name: food.name,
      price: food.price, // Trusted price from MongoDB
      quantity,
      stationTag: food.station || 'Main Counter',
      notes: item.notes || ''
    });
  }

  // 1. Fetch user's active subscription from database for atomic accuracy
  let activeSub = null;
  if (user && user._id) {
    activeSub = await Subscription.findOne({
      userId: user._id,
      isActive: true,
      endDate: { $gt: new Date() }
    }).sort({ price: -1, createdAt: -1 });
  }

  const now = new Date();
  const todayIST = getISTDateString(now);

  let subscriptionDiscount = 0;
  let isEligibleOrder = false;
  let subscriptionDiscountApplied = false;
  let qualifyingMilestone = null;
  let milestoneDiscount = 0;
  let planConfig = null;

  if (activeSub) {
    planConfig = findSubscriptionPlan(activeSub.plan || activeSub.planType);

    if (planConfig) {
      const minOrder = planConfig.minOrder || 31;
      // An order is "eligible" if subtotal meets the plan's minimum threshold
      isEligibleOrder = subtotal >= minOrder;

      // Check subscription discount eligibility:
      // 1. Order meets minimum subtotal
      // 2. Today's subscription discount has not already been used (enforced in IST)
      // 3. Subscription discount uses have not reached plan maximum
      const todayUsed = activeSub.lastSubscriptionDiscountDate === todayIST;
      const usageCount = activeSub.subscriptionUsageCount || 0;
      const maxUses = planConfig.maxDiscountedOrders || 7;
      const usageExhausted = usageCount >= maxUses;

      if (isEligibleOrder && !todayUsed && !usageExhausted) {
        if (planConfig.discountType === 'flat') {
          // Weekly: Flat ₹10 OFF (max ₹10)
          subscriptionDiscount = Math.min(planConfig.discountAmount || 10, subtotal);
        } else {
          // Monthly & 3-Month: 15% OFF up to ₹20
          const pctDiscount = Math.round(subtotal * ((planConfig.discountPercentage || 15) / 100));
          subscriptionDiscount = Math.min(pctDiscount, planConfig.maxDiscount || 20);
        }
        subscriptionDiscountApplied = subscriptionDiscount > 0;
      }

      // Check Milestone Coupon eligibility:
      // Even if subscription discount is exhausted or used today, eligible orders continue counting!
      if (isEligibleOrder && planConfig.milestones && Array.isArray(planConfig.milestones)) {
        const nextEligibleOrderNumber = (activeSub.eligibleOrderCount || 0) + 1;
        const awardedMilestones = activeSub.milestonesAwarded || [];

        const milestone = planConfig.milestones.find(
          m => m.orderNumber === nextEligibleOrderNumber && !awardedMilestones.includes(m.orderNumber)
        );

        if (milestone) {
          qualifyingMilestone = milestone;
          milestoneDiscount = milestone.couponAmount;
        }
      }
    }
  }

  // 2. Coupon/Offer Discount calculation
  let offerDiscount = 0;
  let appliedOffer = null;

  if (couponCode) {
    const couponValidation = await validateAndCalculateCoupon({
      couponCode,
      user,
      items: verifiedItems,
      subtotal
    });
    offerDiscount = couponValidation.discountAmount;
    appliedOffer = couponValidation.offer;
  }

  // 3. Stacking Protection & Total Calculation
  // Total discounts must not exceed subtotal (order cannot be negative)
  const totalPotentialDiscount = subscriptionDiscount + milestoneDiscount + offerDiscount;
  const discount = Math.min(subtotal, totalPotentialDiscount);
  const total = Math.max(0, subtotal - discount);

  return {
    verifiedItems,
    subtotal,
    subscriptionDiscount,
    milestoneDiscount,
    offerDiscount,
    discount,
    total,
    appliedOffer,
    activeSub,
    planConfig,
    isEligibleOrder,
    subscriptionDiscountApplied,
    qualifyingMilestone
  };
};
