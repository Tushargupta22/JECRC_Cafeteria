import Subscription from '../models/Subscription.js';
import User from '../models/User.js';
import LoyaltyTransaction from '../models/LoyaltyTransaction.js';
import {
  SUBSCRIPTION_PLANS,
  findSubscriptionPlan,
  getISTDateString
} from '../config/subscriptionPlans.js';

export { SUBSCRIPTION_PLANS };

export const getPlans = (req, res) => {
  res.status(200).json({
    success: true,
    plans: SUBSCRIPTION_PLANS
  });
};

export const subscribe = async (req, res, next) => {
  try {
    const rawPlan = req.body.planName || req.body.plan || req.body.planType || req.body.id || req.body.planId || '';
    const selectedPlan = findSubscriptionPlan(rawPlan);

    if (!selectedPlan) {
      return res.status(400).json({
        success: false,
        message: `Invalid plan. Choose from: ${SUBSCRIPTION_PLANS.map(p => p.name).join(', ')}`
      });
    }

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + selectedPlan.durationDays * 24 * 60 * 60 * 1000);

    // Deactivate previous active subscriptions of THIS planType
    await Subscription.updateMany(
      {
        userId: req.user._id,
        planType: selectedPlan.planType,
        isActive: true
      },
      { $set: { isActive: false } }
    );

    // Joining bonus loyalty points (+10 for Monthly & 3-Month, awarded once upon joining)
    const hasJoiningBonusConfig = Boolean(selectedPlan.joiningBonusLoyalty && selectedPlan.joiningBonusLoyalty > 0);
    const alreadyReceivedBonus = req.user.subscription?.loyaltyBonusAwarded === true ||
      Boolean(await Subscription.exists({ userId: req.user._id, loyaltyBonusAwarded: true }));
    const shouldAwardBonusNow = hasJoiningBonusConfig && !alreadyReceivedBonus;

    // Create new subscription for the selected plan with initialized counters
    const subscription = await Subscription.create({
      userId: req.user._id,
      plan: selectedPlan.name,
      planType: selectedPlan.planType,
      price: selectedPlan.price,
      discountPercentage: selectedPlan.discountPercentage || 0,
      discountAmount: selectedPlan.discountAmount || 0,
      discountType: selectedPlan.discountType || 'percentage',
      minOrder: selectedPlan.minOrder || 31,
      maxDiscountPerOrder: selectedPlan.maxDiscount || 20,
      dailyLimit: selectedPlan.dailyLimit || 1,
      maxDiscountedOrders: selectedPlan.maxDiscountedOrders || 7,
      subscriptionUsageCount: 0,
      lastSubscriptionDiscountDate: null,
      eligibleOrderCount: 0,
      milestonesAwarded: [],
      loyaltyBonusAwarded: alreadyReceivedBonus || shouldAwardBonusNow,
      startDate,
      endDate,
      isActive: true
    });

    // Award joining bonus loyalty points (once per membership purchase)
    if (shouldAwardBonusNow) {
      await User.findByIdAndUpdate(req.user._id, {
        $inc: { loyaltyPoints: selectedPlan.joiningBonusLoyalty }
      });

      await LoyaltyTransaction.create({
        userId: req.user._id,
        points: selectedPlan.joiningBonusLoyalty,
        type: 'earned',
        reason: `Joining bonus for ${selectedPlan.name}`
      });
    }

    // Get active subscriptions to find current primary subscription
    const activeSubscriptions = await Subscription.find({
      userId: req.user._id,
      isActive: true
    }).sort({ createdAt: -1 });

    // Prefer the newly created subscription or the one with longest duration/highest tier
    const primarySub = subscription;

    // Update User model with the active subscription details and counters
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        subscription: {
          subscriptionId: primarySub._id,
          plan: primarySub.plan,
          planType: primarySub.planType,
          price: primarySub.price,
          discountPercentage: primarySub.discountPercentage,
          discountAmount: primarySub.discountAmount,
          discountType: primarySub.discountType,
          minOrder: primarySub.minOrder,
          maxDiscountPerOrder: primarySub.maxDiscountPerOrder,
          dailyLimit: primarySub.dailyLimit,
          maxDiscountedOrders: primarySub.maxDiscountedOrders,
          subscriptionUsageCount: primarySub.subscriptionUsageCount,
          lastSubscriptionDiscountDate: primarySub.lastSubscriptionDiscountDate,
          eligibleOrderCount: primarySub.eligibleOrderCount,
          milestonesAwarded: primarySub.milestonesAwarded,
          loyaltyBonusAwarded: primarySub.loyaltyBonusAwarded,
          startDate: primarySub.startDate,
          endDate: primarySub.endDate,
          isActive: true
        }
      },
      { new: true }
    );

    console.log('[Subscription] User subscribed to:', selectedPlan.name);
    console.log('[Subscription] Plan price: ₹', selectedPlan.price);
    console.log('[Subscription] Updated user subscription:', user.subscription);

    res.status(201).json({
      success: true,
      message: `Successfully subscribed to ${selectedPlan.name}!`,
      subscription,
      user: user.toJSON()
    });
  } catch (error) {
    next(error);
  }
};

export const getCurrentSubscription = async (req, res, next) => {
  try {
    const activeSubscriptions = await Subscription.find({
      userId: req.user._id,
      isActive: true
    });

    const now = new Date();
    let bestSubscription = null;
    let hasExpired = false;

    // Check each subscription for expiration
    for (const sub of activeSubscriptions) {
      if (new Date(sub.endDate) < now) {
        sub.isActive = false;
        await sub.save();
        hasExpired = true;
      } else {
        // Active and not expired
        if (!bestSubscription || sub.price > bestSubscription.price) {
          bestSubscription = sub;
        }
      }
    }

    if (hasExpired || !bestSubscription) {
      if (bestSubscription) {
        await User.findByIdAndUpdate(req.user._id, {
          subscription: {
            subscriptionId: bestSubscription._id,
            plan: bestSubscription.plan,
            planType: bestSubscription.planType,
            price: bestSubscription.price,
            discountPercentage: bestSubscription.discountPercentage,
            discountAmount: bestSubscription.discountAmount,
            discountType: bestSubscription.discountType,
            minOrder: bestSubscription.minOrder,
            maxDiscountPerOrder: bestSubscription.maxDiscountPerOrder,
            dailyLimit: bestSubscription.dailyLimit,
            maxDiscountedOrders: bestSubscription.maxDiscountedOrders,
            subscriptionUsageCount: bestSubscription.subscriptionUsageCount,
            lastSubscriptionDiscountDate: bestSubscription.lastSubscriptionDiscountDate,
            eligibleOrderCount: bestSubscription.eligibleOrderCount,
            milestonesAwarded: bestSubscription.milestonesAwarded,
            startDate: bestSubscription.startDate,
            endDate: bestSubscription.endDate,
            isActive: true
          }
        });
      } else {
        await User.findByIdAndUpdate(req.user._id, {
          'subscription.isActive': false
        });
      }
    }

    // Group subscriptions by plan type
    const subscriptionsByType = {
      weekly: null,
      monthly: null,
      '3-month': null,
      semester: null
    };

    const allUserSubs = await Subscription.find({
      userId: req.user._id
    }).sort({ createdAt: -1 });

    for (const sub of allUserSubs) {
      const planType = sub.planType === 'semester' ? '3-month' : sub.planType;
      if (planType && !subscriptionsByType[planType]) {
        subscriptionsByType[planType] = {
          id: sub._id,
          plan: sub.plan,
          planType: sub.planType,
          price: sub.price,
          discountPercentage: sub.discountPercentage,
          discountAmount: sub.discountAmount,
          discountType: sub.discountType,
          minOrder: sub.minOrder,
          maxDiscountPerOrder: sub.maxDiscountPerOrder,
          dailyLimit: sub.dailyLimit,
          maxDiscountedOrders: sub.maxDiscountedOrders,
          subscriptionUsageCount: sub.subscriptionUsageCount,
          lastSubscriptionDiscountDate: sub.lastSubscriptionDiscountDate,
          eligibleOrderCount: sub.eligibleOrderCount,
          milestonesAwarded: sub.milestonesAwarded,
          startDate: sub.startDate,
          endDate: sub.endDate,
          isActive: sub.isActive && new Date(sub.endDate) >= now
        };
        // Also keep legacy 'semester' key in sync with '3-month'
        if (planType === '3-month') {
          subscriptionsByType.semester = subscriptionsByType['3-month'];
        }
      }
    }

    const todayIST = getISTDateString(now);

    res.status(200).json({
      success: true,
      subscription: bestSubscription
        ? {
            id: bestSubscription._id,
            plan: bestSubscription.plan,
            planType: bestSubscription.planType,
            price: bestSubscription.price,
            discountPercentage: bestSubscription.discountPercentage,
            discountAmount: bestSubscription.discountAmount,
            discountType: bestSubscription.discountType,
            minOrder: bestSubscription.minOrder,
            maxDiscountPerOrder: bestSubscription.maxDiscountPerOrder,
            dailyLimit: bestSubscription.dailyLimit,
            maxDiscountedOrders: bestSubscription.maxDiscountedOrders,
            subscriptionUsageCount: bestSubscription.subscriptionUsageCount,
            lastSubscriptionDiscountDate: bestSubscription.lastSubscriptionDiscountDate,
            eligibleOrderCount: bestSubscription.eligibleOrderCount,
            milestonesAwarded: bestSubscription.milestonesAwarded,
            todayDiscountUsed: bestSubscription.lastSubscriptionDiscountDate === todayIST,
            discountsRemaining: Math.max(
              0,
              bestSubscription.maxDiscountedOrders - bestSubscription.subscriptionUsageCount
            ),
            startDate: bestSubscription.startDate,
            endDate: bestSubscription.endDate,
            isActive: true
          }
        : null,
      subscriptionsByType,
      isActive: Boolean(bestSubscription)
    });
  } catch (error) {
    next(error);
  }
};

export const cancelSubscription = async (req, res, next) => {
  try {
    const { planType } = req.body;

    if (planType) {
      const normalizedType = planType === 'semester' ? '3-month' : planType;
      await Subscription.updateMany(
        {
          userId: req.user._id,
          $or: [{ planType: normalizedType }, { planType: planType }],
          isActive: true
        },
        { $set: { isActive: false } }
      );
    } else {
      await Subscription.updateMany(
        { userId: req.user._id, isActive: true },
        { $set: { isActive: false } }
      );
    }

    // Find any remaining active subscription
    const remainingActive = await Subscription.find({
      userId: req.user._id,
      isActive: true,
      endDate: { $gte: new Date() }
    }).sort({ price: -1 });

    if (remainingActive.length > 0) {
      const bestSub = remainingActive[0];
      await User.findByIdAndUpdate(req.user._id, {
        subscription: {
          subscriptionId: bestSub._id,
          plan: bestSub.plan,
          planType: bestSub.planType,
          price: bestSub.price,
          discountPercentage: bestSub.discountPercentage,
          discountAmount: bestSub.discountAmount,
          discountType: bestSub.discountType,
          minOrder: bestSub.minOrder,
          maxDiscountPerOrder: bestSub.maxDiscountPerOrder,
          dailyLimit: bestSub.dailyLimit,
          maxDiscountedOrders: bestSub.maxDiscountedOrders,
          subscriptionUsageCount: bestSub.subscriptionUsageCount,
          lastSubscriptionDiscountDate: bestSub.lastSubscriptionDiscountDate,
          eligibleOrderCount: bestSub.eligibleOrderCount,
          milestonesAwarded: bestSub.milestonesAwarded,
          startDate: bestSub.startDate,
          endDate: bestSub.endDate,
          isActive: true
        }
      });
    } else {
      await User.findByIdAndUpdate(req.user._id, {
        'subscription.isActive': false
      });
    }

    res.status(200).json({
      success: true,
      message: planType
        ? `${planType} subscription cancelled successfully`
        : 'All subscriptions cancelled successfully'
    });
  } catch (error) {
    next(error);
  }
};
