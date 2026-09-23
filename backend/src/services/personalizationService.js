import User from '../models/User.js';
import Order from '../models/Order.js';
import Offer from '../models/Offer.js';

/**
 * Analyzes authenticated user's real order history and calculates personalization signals:
 * - Most frequently ordered food item
 * - Most frequently ordered category
 * - Total orders and completed spend
 * - Average order value (AOV)
 * - Days since last order
 * - Active subscription status
 * - Loyalty points
 * - Previous coupon usage history
 *
 * Generates an eligible, user-specific personalized offer and coupon.
 */
export const getPersonalizedOffers = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const now = new Date();

  // Retrieve user's real non-cancelled order history
  const orders = await Order.find({
    userId,
    orderStatus: { $ne: 'Cancelled' }
  })
    .sort({ createdAt: -1 })
    .lean();

  // Aggregate signals
  const itemCounts = {};
  const categoryCounts = {};
  let totalSpent = 0;
  const usedCouponCodes = new Set();

  for (const order of orders) {
    totalSpent += order.total || 0;
    if (order.couponCode) {
      usedCouponCodes.add(order.couponCode.toUpperCase().trim());
    }

    if (order.items && Array.isArray(order.items)) {
      for (const item of order.items) {
        const name = (item.name || '').trim();
        if (!name) continue;

        if (!itemCounts[name]) {
          itemCounts[name] = {
            name,
            count: 0,
            quantity: 0,
            category: item.stationTag || ''
          };
        }
        itemCounts[name].count += 1;
        itemCounts[name].quantity += item.quantity || 1;

        // Categorize by keywords if category is generic
        const lower = name.toLowerCase();
        let cat = 'Other';
        if (
          lower.includes('coffee') ||
          lower.includes('cold brew') ||
          lower.includes('espresso') ||
          lower.includes('latte') ||
          lower.includes('cooler')
        ) {
          cat = 'Cold Beverages';
        } else if (
          lower.includes('chai') ||
          lower.includes('tea')
        ) {
          cat = 'Chai & Tea';
        } else if (lower.includes('burger') || lower.includes('roll') || lower.includes('grill')) {
          cat = 'Fast Food';
        } else if (lower.includes('dosa') || lower.includes('sandwich') || lower.includes('toast')) {
          cat = 'Breakfast';
        } else if (lower.includes('fries') || lower.includes('snack') || lower.includes('nachos')) {
          cat = 'Snacks & Sides';
        } else if (lower.includes('rice') || lower.includes('bowl') || lower.includes('thali') || lower.includes('dal')) {
          cat = 'Meals & Thalis';
        } else if (lower.includes('salad') || lower.includes('moong') || lower.includes('sprout')) {
          cat = 'Healthy & Greens';
        }

        categoryCounts[cat] = (categoryCounts[cat] || 0) + (item.quantity || 1);
      }
    }
  }

  // Check offers in DB where user is in usedBy
  const recordedUsedOffers = await Offer.find({
    'usedBy.userId': user._id
  }).select('couponCode');
  for (const o of recordedUsedOffers) {
    if (o.couponCode) {
      usedCouponCodes.add(o.couponCode.toUpperCase().trim());
    }
  }

  const orderCount = orders.length;
  const averageOrderValue = orderCount > 0 ? Math.round(totalSpent / orderCount) : 0;

  // Days since latest order
  let daysSinceLastOrder = null;
  if (orderCount > 0 && orders[0].createdAt) {
    const diffMs = now.getTime() - new Date(orders[0].createdAt).getTime();
    daysSinceLastOrder = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  // Active subscription verification
  const isSubscriber = Boolean(
    user.subscription &&
    user.subscription.isActive &&
    user.subscription.endDate &&
    new Date(user.subscription.endDate) > now
  );

  const loyaltyPoints = user.loyaltyPoints || 0;

  // Ranked favorite items (by quantity then order occurrences)
  const sortedItems = Object.values(itemCounts).sort(
    (a, b) => b.quantity - a.quantity || b.count - a.count
  );
  const favoriteItem = sortedItems[0] || null;

  // Ranked favorite categories
  const sortedCategories = Object.entries(categoryCounts).sort(
    (a, b) => b[1] - a[1]
  );
  const favoriteCategory = sortedCategories[0]?.[0] || null;

  // Build prioritized candidate offers based on signals
  const candidates = [];

  // 1. Food Affinity Candidates (evaluated first based on real item/category frequencies)
  if (orderCount > 0 && favoriteItem) {
    const itemName = favoriteItem.name;
    const itemLower = itemName.toLowerCase();
    const catLower = (favoriteCategory || '').toLowerCase();

    // Coffee / Cold Brew / Beverages
    if (
      (itemLower.includes('coffee') ||
        itemLower.includes('brew') ||
        itemLower.includes('latte') ||
        catLower.includes('beverage')) &&
      !itemLower.includes('chai') &&
      !itemLower.includes('tea')
    ) {
      candidates.push({
        couponCode: 'COFFEELOVER',
        title: `20% OFF ${itemName.includes('Coffee') ? itemName : 'Cold Coffee'}`,
        description: 'Because you order it frequently',
        discount: 20,
        discountType: 'percentage',
        targetAudience: 'frequent_coffee',
        badgeText: '☕ Coffee Lover Perk',
        icon: '☕',
        recommendationReason: '☕ Handpicked for you because you love campus coffee',
        perUserLimit: 3,
        minimumOrder: 40
      });
    }

    // Burger / Fast Food
    if (
      itemLower.includes('burger') ||
      itemLower.includes('patty') ||
      catLower.includes('fast food') ||
      catLower.includes('grill')
    ) {
      candidates.push({
        couponCode: 'BURGERFAN',
        title: `15% OFF ${itemName.includes('Burger') ? itemName : 'Your Favourite Burger'}`,
        description: 'Because you order it frequently',
        discount: 15,
        discountType: 'percentage',
        targetAudience: 'frequent_burgers',
        badgeText: '🍔 Burger Lover Perk',
        icon: '🍔',
        recommendationReason: '🍔 Tailored deal for our campus burger lovers',
        perUserLimit: 3,
        minimumOrder: 60
      });
    }

    // Chai / Tea / Breakfast
    if (
      itemLower.includes('chai') ||
      itemLower.includes('tea') ||
      itemLower.includes('dosa') ||
      catLower.includes('breakfast')
    ) {
      candidates.push({
        couponCode: 'CHAITIME',
        title: `Special offer on ${itemLower.includes('chai') ? 'Masala Chai' : itemName}`,
        description: 'Because you order it frequently',
        discount: 20,
        discountType: 'percentage',
        targetAudience: 'frequent_chai',
        badgeText: '🍵 Chai Lover Perk',
        icon: '🍵',
        recommendationReason: '🍵 Handpicked for you because you love campus chai',
        perUserLimit: 3,
        minimumOrder: 30
      });
    }

    // Snacks & Sides
    if (
      itemLower.includes('fries') ||
      itemLower.includes('snack') ||
      itemLower.includes('roll') ||
      itemLower.includes('sandwich') ||
      catLower.includes('snack')
    ) {
      candidates.push({
        couponCode: 'SNACK10',
        title: 'Special Snack Combo Offer',
        description: 'Because you order it frequently',
        discount: 15,
        discountType: 'percentage',
        targetAudience: 'frequent_snacks',
        badgeText: '🍟 Snack Attack Perk',
        icon: '🍟',
        recommendationReason: '🍟 Recommended based on your frequent snack orders',
        perUserLimit: 3,
        minimumOrder: 50
      });
    }

    // Generic favorite item perk if none of the above matched
    if (candidates.length === 0) {
      candidates.push({
        couponCode: 'FAVMEAL20',
        title: `20% OFF ${itemName}`,
        description: 'Because you order it frequently',
        discount: 20,
        discountType: 'percentage',
        targetAudience: 'frequent_item',
        badgeText: '🍽️ Favorite Meal Perk',
        icon: '🍽️',
        recommendationReason: `🍽️ Tailored specifically for you based on your love for ${itemName}`,
        perUserLimit: 2,
        minimumOrder: 50
      });
    }
  }

  // 2. Subscriber-exclusive offer
  if (isSubscriber) {
    candidates.push({
      couponCode: 'PLUSHERO',
      title: 'Exclusive Dining Club Offer',
      description: 'Exclusive 20% VIP perk and priority kitchen service for active members.',
      discount: 20,
      discountType: 'percentage',
      targetAudience: 'subscribers',
      badgeText: '⭐ VIP Member Perk',
      icon: '⭐',
      recommendationReason: '⭐ Exclusive VIP perk for Cafeteria Plus Members',
      subscriptionRequirement: true,
      perUserLimit: 5,
      minimumOrder: 0
    });
  }

  // 3. Inactive User (Welcome Back)
  if (orderCount > 0 && daysSinceLastOrder !== null && daysSinceLastOrder >= 7) {
    candidates.push({
      couponCode: 'BACK15',
      title: '15% OFF Welcome Back Treat',
      description: 'We missed you at the cafeteria! Grab your favorite meal today.',
      discount: 15,
      discountType: 'percentage',
      targetAudience: 'inactive_users',
      badgeText: '👋 Welcome Back Perk',
      icon: '👋',
      recommendationReason: 'Welcome back special discount',
      perUserLimit: 1,
      minimumOrder: 50
    });
  }

  // 4. High Value Customer / High Spender
  if (totalSpent >= 500 || loyaltyPoints >= 250 || averageOrderValue >= 150) {
    candidates.push({
      couponCode: 'CAMPUSVIP',
      title: 'Special Reward for You',
      description: 'Exclusive 25% off loyalty perk for our top campus foodies.',
      discount: 25,
      discountType: 'percentage',
      targetAudience: 'high_spenders',
      badgeText: '👑 Campus VIP Perk',
      icon: '👑',
      recommendationReason: '🪙 Campus VIP high spender bonus',
      perUserLimit: 2,
      minimumOrder: 150
    });
  }
  // 5. New User / Fallback Welcome Offer
  // Used ONLY when user has 0 orders, or as ultimate unredeemed fallback
  const welcomeOffer = {
    couponCode: 'JECRC50',
    title: 'Flat ₹50 OFF Campus Dining',
    description: 'Welcome to campus cafeteria dining! Instant ₹50 flat discount on your meal.',
    discount: 50,
    discountType: 'fixed',
    targetAudience: 'new_users',
    badgeText: '🎉 New Student Welcome Perk',
    icon: '🎉',
    recommendationReason: 'Special welcome perk for campus foodies',
    perUserLimit: 1,
    minimumOrder: 100
  };

  if (orderCount === 0 && !isSubscriber) {
    // New non-subscriber receives welcome offer
    candidates.length = 0;
    candidates.push(welcomeOffer);
  } else {
    // Append welcome offer as fallback
    candidates.push(welcomeOffer);
  }

  // Filter out candidates whose one-time limit is exhausted for this user
  const eligibleCandidates = candidates.filter((cand) => {
    const uses = (cand.couponCode && usedCouponCodes.has(cand.couponCode.toUpperCase())) ? 1 : 0;
    const limit = cand.perUserLimit || 1;
    return uses < limit;
  });

  // Pick top eligible candidate, or fallback to first candidate if all exhausted
  const selectedCandidate = eligibleCandidates[0] || candidates[0] || welcomeOffer;

  // Ensure selected offer exists in MongoDB Offer collection
  let offerRecord = await Offer.findOne({ couponCode: selectedCandidate.couponCode });
  const thirtyDaysAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  if (!offerRecord) {
    offerRecord = await Offer.create({
      title: selectedCandidate.title,
      description: selectedCandidate.description,
      discount: selectedCandidate.discount,
      discountType: selectedCandidate.discountType,
      couponCode: selectedCandidate.couponCode,
      validFrom: yesterday,
      validUntil: thirtyDaysAhead,
      targetAudience: selectedCandidate.targetAudience,
      minimumOrder: selectedCandidate.minimumOrder || 0,
      subscriptionRequirement: Boolean(selectedCandidate.subscriptionRequirement),
      perUserLimit: selectedCandidate.perUserLimit || 1,
      recommendationReason: selectedCandidate.recommendationReason,
      badgeText: selectedCandidate.badgeText,
      icon: selectedCandidate.icon,
      isActive: true
    });
  } else {
    // Keep offer active and refresh metadata if needed
    let needsUpdate = false;
    if (!offerRecord.isActive) {
      offerRecord.isActive = true;
      needsUpdate = true;
    }
    if (offerRecord.validUntil < now) {
      offerRecord.validUntil = thirtyDaysAhead;
      needsUpdate = true;
    }
    if (selectedCandidate.badgeText && offerRecord.badgeText !== selectedCandidate.badgeText) {
      offerRecord.badgeText = selectedCandidate.badgeText;
      needsUpdate = true;
    }
    if (selectedCandidate.icon && offerRecord.icon !== selectedCandidate.icon) {
      offerRecord.icon = selectedCandidate.icon;
      needsUpdate = true;
    }
    if (selectedCandidate.title && offerRecord.title !== selectedCandidate.title) {
      offerRecord.title = selectedCandidate.title;
      needsUpdate = true;
    }
    if (selectedCandidate.description && offerRecord.description !== selectedCandidate.description) {
      offerRecord.description = selectedCandidate.description;
      needsUpdate = true;
    }
    if (needsUpdate) {
      await offerRecord.save();
    }
  }

  const enrichedOffer = {
    ...offerRecord.toObject(),
    title: selectedCandidate.title,
    description: selectedCandidate.description,
    couponCode: selectedCandidate.couponCode,
    badgeText: selectedCandidate.badgeText,
    icon: selectedCandidate.icon,
    recommendationReason: selectedCandidate.recommendationReason,
    discount: selectedCandidate.discount,
    discountType: selectedCandidate.discountType,
    targetAudience: selectedCandidate.targetAudience
  };

  return {
    userStats: {
      orderCount,
      totalSpent,
      averageOrderValue,
      loyaltyPoints,
      isSubscriber,
      daysSinceLastOrder,
      favoriteFood: favoriteItem?.name || null,
      favoriteCategory: favoriteCategory || null,
      usedCoupons: Array.from(usedCouponCodes)
    },
    recommendations: [enrichedOffer],
    offers: [enrichedOffer],
    offer: enrichedOffer
  };
};
