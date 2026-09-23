import User from '../models/User.js';
import Order from '../models/Order.js';
import Subscription from '../models/Subscription.js';
import LoyaltyTransaction from '../models/LoyaltyTransaction.js';

export const getAdminAnalytics = async (req, res, next) => {
  try {
    // 1. Total users
    const totalUsers = await User.countDocuments({ role: { $in: ['user', 'student'] } });

    // 2. Total orders
    const totalOrders = await Order.countDocuments();

    // 3. Revenue & Average Order Value (AOV) via Aggregation
    const revenueAggregation = await Order.aggregate([
      {
        $match: {
          paymentStatus: 'Paid',
          orderStatus: { $ne: 'Cancelled' }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
          paidOrdersCount: { $sum: 1 }
        }
      }
    ]);

    const totalRevenue = revenueAggregation[0]?.totalRevenue || 0;
    const paidOrdersCount = revenueAggregation[0]?.paidOrdersCount || 0;
    const averageOrderValue = paidOrdersCount > 0 ? Math.round((totalRevenue / paidOrdersCount) * 100) / 100 : 0;

    // 4. Popular foods via Aggregation
    const popularFoods = await Order.aggregate([
      {
        $unwind: '$items'
      },
      {
        $group: {
          _id: '$items.name',
          foodId: { $first: '$items.foodId' },
          name: { $first: '$items.name' },
          stationTag: { $first: '$items.stationTag' },
          totalSold: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      },
      {
        $sort: { totalSold: -1 }
      },
      {
        $limit: 5
      }
    ]);

    // 5. Active subscriptions
    const now = new Date();
    const activeSubscriptions = await Subscription.countDocuments({
      isActive: true,
      endDate: { $gte: now }
    });

    // 6. Loyalty points distributed
    const loyaltyAggregation = await LoyaltyTransaction.aggregate([
      {
        $match: { type: 'earned' }
      },
      {
        $group: {
          _id: null,
          totalPoints: { $sum: '$points' }
        }
      }
    ]);
    const loyaltyPointsDistributed = loyaltyAggregation[0]?.totalPoints || 0;

    // 7. Orders distribution by status
    const statusAggregation = await Order.aggregate([
      {
        $group: {
          _id: '$orderStatus',
          count: { $sum: 1 }
        }
      }
    ]);
    const ordersByStatus = statusAggregation.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    // 8. Recent 10 orders
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('userId', 'name email department profileImage');

    res.status(200).json({
      success: true,
      analytics: {
        totalUsers,
        totalOrders,
        totalRevenue,
        averageOrderValue,
        activeSubscriptions,
        loyaltyPointsDistributed,
        popularFoods,
        ordersByStatus,
        recentOrders
      }
    });
  } catch (error) {
    next(error);
  }
};
