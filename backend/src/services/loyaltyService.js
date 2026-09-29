import User from '../models/User.js';
import Subscription from '../models/Subscription.js';
import LoyaltyTransaction from '../models/LoyaltyTransaction.js';
import { findSubscriptionPlan } from '../config/subscriptionPlans.js';

/**
 * Award loyalty points when an order completes.
 * Standard rule: ₹10 spent = 1 loyalty point.
 * Dining Club bonus rule: 1.5x multiplier after completing qualifying milestone:
 * - Monthly: 15th eligible order
 * - 3-Month: 21st eligible order
 * Ensures idempotency: will not double-award if called repeatedly.
 */
export const awardLoyaltyForOrder = async (order) => {
  if (!order) {
    throw new Error('Order object is required to award loyalty points');
  }

  // Idempotency check: do not award twice
  if (order.loyaltyAwarded) {
    return {
      awarded: false,
      reason: 'Loyalty points already awarded for this order',
      points: 0
    };
  }

  // Determine loyalty multiplier based on user's active Dining Club membership milestones
  let multiplier = 1.0;
  const activeSub = await Subscription.findOne({
    userId: order.userId,
    isActive: true,
    endDate: { $gt: new Date() }
  }).sort({ price: -1, createdAt: -1 });

  if (activeSub) {
    const planConfig = findSubscriptionPlan(activeSub.plan || activeSub.planType);
    if (planConfig && planConfig.loyaltyMultiplierMilestone) {
      if ((activeSub.eligibleOrderCount || 0) >= planConfig.loyaltyMultiplierMilestone) {
        multiplier = 1.5;
      }
    }
  }

  const basePoints = (order.total || 0) / 10;
  const pointsToAward = Math.floor(basePoints * multiplier);

  // Update user's loyaltyPoints, totalOrders, and totalSpent
  const updatedUser = await User.findByIdAndUpdate(
    order.userId,
    {
      $inc: {
        loyaltyPoints: pointsToAward,
        totalOrders: 1,
        totalSpent: order.total || 0
      }
    },
    { new: true }
  );

  // Record loyalty transaction in ledger
  let transaction = null;
  if (pointsToAward > 0) {
    const reason = multiplier > 1
      ? `Reward earned (1.5x Dining Club multiplier) from order ${order.orderNumber}`
      : `Reward earned from order ${order.orderNumber}`;

    transaction = await LoyaltyTransaction.create({
      userId: order.userId,
      points: pointsToAward,
      type: 'earned',
      reason,
      orderId: order._id
    });
  }

  // Mark order as awarded
  order.loyaltyAwarded = true;
  await order.save();

  return {
    awarded: true,
    points: pointsToAward,
    multiplier,
    newBalance: updatedUser ? updatedUser.loyaltyPoints : pointsToAward,
    transaction
  };
};
