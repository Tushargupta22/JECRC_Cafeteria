import Order from '../models/Order.js';
import User from '../models/User.js';

export const getLeaderboard = async (req, res, next) => {
  try {
    const { period = 'daily' } = req.query;
    const now = new Date();
    let startDate = new Date();

    if (period === 'daily') {
      // Start of today (00:00:00.000)
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'weekly') {
      // Last 7 days
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'monthly') {
      // Last 30 days
      startDate.setDate(now.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
    } else {
      startDate.setHours(0, 0, 0, 0);
    }

    console.log('[Leaderboard] ========== NEW REQUEST ==========');
    console.log('[Leaderboard] Period:', period);
    console.log('[Leaderboard] Start Date:', startDate);
    console.log('[Leaderboard] Current Time:', now);

    // First, let's check if there are ANY orders in the database
    const totalOrders = await Order.countDocuments({});
    console.log('[Leaderboard] Total orders in database:', totalOrders);

    const ordersInPeriod = await Order.countDocuments({
      createdAt: { $gte: startDate }
    });
    console.log('[Leaderboard] Orders created since', startDate, ':', ordersInPeriod);

    const paidOrders = await Order.countDocuments({
      createdAt: { $gte: startDate },
      paymentStatus: 'Paid'
    });
    console.log('[Leaderboard] Paid orders in period:', paidOrders);

    const nonCancelledPaidOrders = await Order.countDocuments({
      createdAt: { $gte: startDate },
      orderStatus: { $ne: 'Cancelled' },
      paymentStatus: 'Paid'
    });
    console.log('[Leaderboard] Non-cancelled paid orders:', nonCancelledPaidOrders);

    // Aggregate orders placed within the selected period
    // Strictly count paid, non-cancelled, non-failed orders from real registered student users
    const aggregatedRanks = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          orderStatus: { $nin: ['Cancelled', 'Failed'] },
          paymentStatus: 'Paid'
        }
      },
      {
        $group: {
          _id: '$userId',
          spend: { $sum: '$total' },
          ordersCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      {
        $unwind: '$userDetails'
      },
      {
        $match: {
          'userDetails.role': { $ne: 'admin' },
          'userDetails.email': { $not: /(test|demo|integration|example)/i },
          'userDetails.name': { $not: /(integration test|demo user)/i }
        }
      },
      {
        $project: {
          _id: 1,
          spend: 1,
          ordersCount: 1,
          points: { $multiply: [{ $floor: { $divide: ['$spend', 10] } }, 2] }, // Points calculation based on spend
          name: '$userDetails.name',
          shortName: { $ifNull: ['$userDetails.shortName', '$userDetails.name'] },
          department: '$userDetails.department',
          avatar: '$userDetails.profileImage',
          loyaltyPoints: '$userDetails.loyaltyPoints'
        }
      },
      {
        $sort: { spend: -1, ordersCount: -1 }
      }
    ]);

    console.log('[Leaderboard] Period:', period, 'Start Date:', startDate);
    console.log('[Leaderboard] Aggregated ranks count:', aggregatedRanks.length);

    // Only show real users who have actually placed orders
    // No fake/demo users, no fallback - only actual order data
    const finalLeaderboard = aggregatedRanks;

    // Assign sequential ranks 1, 2, 3...
    const rankedData = finalLeaderboard.map((item, index) => {
      const isCurrentUser = req.user ? req.user._id.toString() === item._id.toString() : false;
      return {
        rank: index + 1,
        userId: item._id,
        name: item.name,
        shortName: item.shortName,
        department: item.department || 'Campus Student',
        spend: Math.round(item.spend),
        points: Math.round(item.points),
        ordersCount: item.ordersCount,
        avatar: item.avatar,
        isCurrentUser,
        badge: index === 0 ? '👑 Leading • Campus Legend' : index === 1 ? '🥈 Runner Up' : index === 2 ? '🥉 Bronze Finisher' : undefined
      };
    });

    // Add no-cache headers to prevent browser caching of leaderboard data
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.status(200).json({
      success: true,
      period,
      count: rankedData.length,
      leaderboard: rankedData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Helper function to calculate a specific authenticated user's real daily rank and spend
 */
export const calculateUserDailyRankAndSpend = async (userId) => {
  if (!userId) {
    return { dailyRank: 0, dailySpend: 0, dailyOrdersCount: 0 };
  }

  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);

  const aggregatedRanks = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
        orderStatus: { $nin: ['Cancelled', 'Failed'] },
        paymentStatus: 'Paid'
      }
    },
    {
      $group: {
        _id: '$userId',
        spend: { $sum: '$total' },
        ordersCount: { $sum: 1 }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'userDetails'
      }
    },
    {
      $unwind: '$userDetails'
    },
    {
      $match: {
        'userDetails.role': { $ne: 'admin' },
        'userDetails.email': { $not: /(test|demo|integration|example)/i },
        'userDetails.name': { $not: /(integration test|demo user)/i }
      }
    },
    {
      $sort: { spend: -1, ordersCount: -1 }
    }
  ]);

  const index = aggregatedRanks.findIndex(
    item => item._id && item._id.toString() === userId.toString()
  );

  if (index !== -1) {
    return {
      dailyRank: index + 1,
      dailySpend: Math.round(aggregatedRanks[index].spend),
      dailyOrdersCount: aggregatedRanks[index].ordersCount
    };
  }

  return {
    dailyRank: 0,
    dailySpend: 0,
    dailyOrdersCount: 0
  };
};
