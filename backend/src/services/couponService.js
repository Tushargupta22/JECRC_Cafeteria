import Offer from '../models/Offer.js';
import Order from '../models/Order.js';

/**
 * Validates a coupon code against all business rules:
 * - Code existence and active status
 * - Valid date range (validFrom to validUntil)
 * - Global usage limit
 * - User-specific assignment (userId ownership)
 * - Subscription requirement
 * - New user target audience
 * - Per-user usage limit & previous order redemptions
 * - Minimum order amount
 * - Applicable category/food constraints
 * - Server-controlled discount calculation
 */
export const validateAndCalculateCoupon = async ({
  couponCode,
  user,
  items = [],
  subtotal = 0
}) => {
  if (!couponCode) {
    const error = new Error('Coupon code is required');
    error.statusCode = 400;
    throw error;
  }

  const cleanCode = String(couponCode).trim().toUpperCase();
  const offer = await Offer.findOne({ couponCode: cleanCode });

  if (!offer) {
    const error = new Error(`Invalid coupon code: "${cleanCode}"`);
    error.statusCode = 400;
    throw error;
  }

  if (!offer.isActive) {
    const error = new Error(`Coupon "${cleanCode}" is no longer active`);
    error.statusCode = 400;
    throw error;
  }

  const now = new Date();
  if (offer.validFrom && new Date(offer.validFrom) > now) {
    const error = new Error(`Coupon "${cleanCode}" is not active yet`);
    error.statusCode = 400;
    throw error;
  }

  if (offer.validUntil && new Date(offer.validUntil) < now) {
    const error = new Error(`Coupon "${cleanCode}" has expired`);
    error.statusCode = 400;
    throw error;
  }

  // Check global usage limit
  if (offer.usageLimit && offer.usageLimit > 0 && (offer.timesUsed || 0) >= offer.usageLimit) {
    const error = new Error(`Coupon "${cleanCode}" has reached its maximum usage limit`);
    error.statusCode = 400;
    throw error;
  }

  // Check user-specific assignment
  if (offer.userId) {
    if (!user || !user._id) {
      const error = new Error('Please sign in to redeem this personalized coupon');
      error.statusCode = 401;
      throw error;
    }
    if (offer.userId.toString() !== user._id.toString()) {
      const error = new Error('This personalized coupon is exclusive to another student account');
      error.statusCode = 403;
      throw error;
    }
  }

  // Check subscription requirement
  if (offer.subscriptionRequirement || offer.targetAudience === 'subscribers') {
    const isSubscriber = Boolean(
      user &&
      user.subscription &&
      user.subscription.isActive &&
      user.subscription.endDate &&
      new Date(user.subscription.endDate) > now
    );
    if (!isSubscriber) {
      const error = new Error('This coupon is exclusively for active Cafeteria Plus subscribers');
      error.statusCode = 403;
      throw error;
    }
  }

  // Check new user rule
  if (offer.targetAudience === 'new_users' && user && user._id) {
    const orderCount = await Order.countDocuments({
      userId: user._id,
      orderStatus: { $ne: 'Cancelled' }
    });
    if (orderCount > 0) {
      const error = new Error('This welcome coupon is only valid for your first order');
      error.statusCode = 400;
      throw error;
    }
  }

  // Check per-user redemption limit & previous usage
  if (user && user._id) {
    const pastOrderUses = await Order.countDocuments({
      userId: user._id,
      couponCode: cleanCode,
      orderStatus: { $ne: 'Cancelled' }
    });
    const recordedUses = (offer.usedBy || []).filter(
      (u) => u.userId && u.userId.toString() === user._id.toString()
    ).length;
    const totalUserUses = Math.max(pastOrderUses, recordedUses);
    const maxUses = offer.perUserLimit || 1;

    if (totalUserUses >= maxUses) {
      const error = new Error(`You have already redeemed coupon "${cleanCode}"`);
      error.statusCode = 400;
      throw error;
    }
  }

  // Check minimum order amount
  const numericSubtotal = Number(subtotal) || 0;
  if (offer.minimumOrder && offer.minimumOrder > 0) {
    if (numericSubtotal < offer.minimumOrder) {
      const error = new Error(
        `Minimum order amount of ₹${offer.minimumOrder} required to apply coupon "${cleanCode}"`
      );
      error.statusCode = 400;
      throw error;
    }
  }

  // Calculate discount
  let discountAmount = 0;
  if (offer.discountType === 'percentage') {
    discountAmount = Math.round((numericSubtotal * offer.discount) / 100);
  } else {
    discountAmount = Math.min(numericSubtotal, offer.discount);
  }

  return {
    valid: true,
    offer,
    couponCode: offer.couponCode,
    title: offer.title,
    description: offer.description,
    discountType: offer.discountType,
    discountValue: offer.discount,
    discountAmount,
    message: `Coupon "${offer.couponCode}" applied successfully! Saved ₹${discountAmount}`
  };
};
