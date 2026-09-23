import Food from '../models/Food.js';
import Offer from '../models/Offer.js';
import mongoose from 'mongoose';
import { validateAndCalculateCoupon } from './couponService.js';

/**
 * Validates cart items against MongoDB database, fetches true item prices,
 * and calculates subtotal, discounts (subscription & coupon), and final total.
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

  // 1. Subscription Discount calculation
  let subscriptionDiscount = 0;
  if (user && user.subscription && user.subscription.isActive) {
    const now = new Date();
    if (user.subscription.endDate && new Date(user.subscription.endDate) > now) {
      const pct = user.subscription.discountPercentage || 0;
      subscriptionDiscount = Math.round(subtotal * (pct / 100));
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

  const discount = subscriptionDiscount + offerDiscount;
  const total = Math.max(0, subtotal - discount);

  return {
    verifiedItems,
    subtotal,
    subscriptionDiscount,
    offerDiscount,
    discount,
    total,
    appliedOffer
  };
};
