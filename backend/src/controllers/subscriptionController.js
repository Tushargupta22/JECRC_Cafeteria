import Subscription from '../models/Subscription.js';
import User from '../models/User.js';

export const SUBSCRIPTION_PLANS = [
  {
    id: 'weekly-snack-pass',
    plan: 'weekly-snack-pass',
    planType: 'weekly',
    name: 'Weekly Snack Pass',
    description: '10% off snacks & quick bites across all counters',
    price: 199,
    durationDays: 7,
    discountPercentage: 10,
    features: [
      '10% off on all cafe snacks and light bites',
      'Free tech packaging on takeaway orders',
      'Instant digital counter receipts'
    ]
  },
  {
    id: 'monthly-plus-membership',
    plan: 'monthly-plus-membership',
    planType: 'monthly',
    name: 'Monthly Plus Membership',
    description: '15% off all counters + priority kitchen prep queue',
    price: 599,
    durationDays: 30,
    discountPercentage: 15,
    features: [
      '15% flat discount on all food & beverage counters',
      'Priority kitchen prep queue tag',
      '1.5x boosted loyalty coins (15 coins per ₹100)',
      'Free beverage refill on exam weeks'
    ]
  },
  {
    id: 'semester-unlimited',
    plan: 'semester-unlimited',
    planType: 'semester',
    name: 'Semester Unlimited',
    description: '20% max discount + VIP perks & free daily espresso',
    price: 1999,
    durationDays: 120,
    discountPercentage: 20,
    features: [
      '20% maximum discount across all university cafeterias',
      'VIP lounge seating access',
      '1 complimentary specialty espresso / chai per day',
      '2x loyalty multiplier on daily leaderboard'
    ]
  }
];

export const getPlans = (req, res) => {
  res.status(200).json({
    success: true,
    plans: SUBSCRIPTION_PLANS
  });
};

export const subscribe = async (req, res, next) => {
  try {
    const rawPlan = req.body.planName || req.body.plan || req.body.id || req.body.planId || '';
    const query = String(rawPlan).trim().toLowerCase();

    const selectedPlan = SUBSCRIPTION_PLANS.find(p => {
      const name = p.name.toLowerCase();
      const id = (p.id || '').toLowerCase();
      const plan = (p.plan || '').toLowerCase();
      return (
        name === query ||
        id === query ||
        plan === query ||
        name.includes(query) ||
        id.includes(query) ||
        (query.includes('weekly') && id.includes('weekly')) ||
        (query.includes('monthly') && id.includes('monthly')) ||
        (query.includes('semester') && id.includes('semester')) ||
        (query.includes('snack') && id.includes('snack')) ||
        (query.includes('plus') && id.includes('monthly'))
      );
    });

    if (!selectedPlan) {
      return res.status(400).json({
        success: false,
        message: `Invalid plan. Choose from: ${SUBSCRIPTION_PLANS.map(p => p.name).join(', ')}`
      });
    }

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + selectedPlan.durationDays * 24 * 60 * 60 * 1000);

    // FIXED: Only deactivate previous subscriptions of THIS SPECIFIC PLAN TYPE
    // This ensures Weekly, Monthly, and Semester are independent
    await Subscription.updateMany(
      { 
        userId: req.user._id, 
        planType: selectedPlan.planType,
        isActive: true 
      },
      { $set: { isActive: false } }
    );

    // Create new subscription for the selected plan only
    const subscription = await Subscription.create({
      userId: req.user._id,
      plan: selectedPlan.name,
      planType: selectedPlan.planType,
      price: selectedPlan.price,
      discountPercentage: selectedPlan.discountPercentage,
      startDate,
      endDate,
      isActive: true
    });

    // Get all active subscriptions for this user to determine highest discount
    const activeSubscriptions = await Subscription.find({
      userId: req.user._id,
      isActive: true
    });

    // Find the subscription with the highest discount percentage
    let bestSubscription = subscription;
    for (const sub of activeSubscriptions) {
      if (sub.discountPercentage > bestSubscription.discountPercentage) {
        bestSubscription = sub;
      }
    }

    // Update User model with the best active subscription (highest discount)
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        subscription: {
          plan: bestSubscription.plan,
          price: bestSubscription.price,
          discountPercentage: bestSubscription.discountPercentage,
          startDate: bestSubscription.startDate,
          endDate: bestSubscription.endDate,
          isActive: true
        }
      },
      { new: true }
    );

    console.log('[Subscription] User subscribed to:', selectedPlan.name);
    console.log('[Subscription] Plan discount:', selectedPlan.discountPercentage, '%');
    console.log('[Subscription] Best subscription discount:', bestSubscription.discountPercentage, '%');
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
    // Get all active subscriptions for this user
    const activeSubscriptions = await Subscription.find({
      userId: req.user._id,
      isActive: true
    });

    const now = new Date();
    let bestSubscription = null;
    let hasExpired = false;

    // Check each subscription for expiration and find the best one
    for (const sub of activeSubscriptions) {
      if (new Date(sub.endDate) < now) {
        // This subscription has expired
        sub.isActive = false;
        await sub.save();
        hasExpired = true;
      } else {
        // Active and not expired - check if it's the best discount
        if (!bestSubscription || sub.discountPercentage > bestSubscription.discountPercentage) {
          bestSubscription = sub;
        }
      }
    }

    // If we found expired subscriptions, update the user model
    if (hasExpired || !bestSubscription) {
      if (bestSubscription) {
        // Update user with best active subscription
        await User.findByIdAndUpdate(req.user._id, {
          subscription: {
            plan: bestSubscription.plan,
            price: bestSubscription.price,
            discountPercentage: bestSubscription.discountPercentage,
            startDate: bestSubscription.startDate,
            endDate: bestSubscription.endDate,
            isActive: true
          }
        });
      } else {
        // No active subscriptions - deactivate in user model
        await User.findByIdAndUpdate(req.user._id, {
          'subscription.isActive': false
        });
      }
    }

    // Get all subscriptions by plan type for frontend display
    const subscriptionsByType = {
      weekly: null,
      monthly: null,
      semester: null
    };

    const allUserSubs = await Subscription.find({
      userId: req.user._id
    }).sort({ createdAt: -1 });

    for (const sub of allUserSubs) {
      const planType = sub.planType;
      if (planType && !subscriptionsByType[planType]) {
        subscriptionsByType[planType] = {
          plan: sub.plan,
          planType: sub.planType,
          price: sub.price,
          discountPercentage: sub.discountPercentage,
          startDate: sub.startDate,
          endDate: sub.endDate,
          isActive: sub.isActive && new Date(sub.endDate) >= now
        };
      }
    }

    res.status(200).json({
      success: true,
      subscription: bestSubscription ? {
        plan: bestSubscription.plan,
        planType: bestSubscription.planType,
        price: bestSubscription.price,
        discountPercentage: bestSubscription.discountPercentage,
        startDate: bestSubscription.startDate,
        endDate: bestSubscription.endDate,
        isActive: true
      } : null,
      subscriptionsByType,
      isActive: Boolean(bestSubscription)
    });
  } catch (error) {
    next(error);
  }
};

export const cancelSubscription = async (req, res, next) => {
  try {
    const { planType } = req.body; // Optional: specify which plan to cancel

    if (planType) {
      // Cancel specific plan type only
      await Subscription.updateMany(
        { 
          userId: req.user._id, 
          planType: planType,
          isActive: true 
        },
        { $set: { isActive: false } }
      );
    } else {
      // Cancel all subscriptions
      await Subscription.updateMany(
        { userId: req.user._id, isActive: true },
        { $set: { isActive: false } }
      );
    }

    // Find remaining active subscriptions
    const remainingActive = await Subscription.find({
      userId: req.user._id,
      isActive: true
    });

    if (remainingActive.length > 0) {
      // Find best remaining subscription
      let bestSub = remainingActive[0];
      for (const sub of remainingActive) {
        if (sub.discountPercentage > bestSub.discountPercentage) {
          bestSub = sub;
        }
      }
      
      // Update user with best remaining subscription
      await User.findByIdAndUpdate(req.user._id, {
        subscription: {
          plan: bestSub.plan,
          price: bestSub.price,
          discountPercentage: bestSub.discountPercentage,
          startDate: bestSub.startDate,
          endDate: bestSub.endDate,
          isActive: true
        }
      });
    } else {
      // No active subscriptions remaining
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
