import User from '../models/User.js';
import LoyaltyTransaction from '../models/LoyaltyTransaction.js';

/**
 * Award loyalty points when an order completes.
 * Standard rule: ₹10 spent = 1 loyalty point.
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

  const pointsToAward = Math.floor((order.total || 0) / 10);

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
    transaction = await LoyaltyTransaction.create({
      userId: order.userId,
      points: pointsToAward,
      type: 'earned',
      reason: `Reward earned from order ${order.orderNumber}`,
      orderId: order._id
    });
  }

  // Mark order as awarded
  order.loyaltyAwarded = true;
  await order.save();

  return {
    awarded: true,
    points: pointsToAward,
    newBalance: updatedUser ? updatedUser.loyaltyPoints : pointsToAward,
    transaction
  };
};
