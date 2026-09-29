/**
 * JECRC Cafeteria Dining Club Membership Plans
 * Single Source of Truth for Plan Configurations & Rules
 */

export const SUBSCRIPTION_PLANS = [
  {
    id: 'weekly-dining-club',
    plan: 'weekly-dining-club',
    planType: 'weekly',
    name: 'Weekly Dining Club',
    price: 99,
    durationDays: 7,
    minOrder: 31,
    discountType: 'flat',
    discountAmount: 10,
    maxDiscount: 10,
    dailyLimit: 1,
    maxDiscountedOrders: 7,
    joiningBonusLoyalty: 0,
    description: 'Flat ₹10 OFF on eligible orders (₹31+) • 1 order/day • Up to 7 orders',
    features: [
      '7 Days',
      '₹10 OFF on eligible orders',
      '₹31+ minimum order',
      '1 discounted order per day'
    ]
  },
  {
    id: 'monthly-dining-club',
    plan: 'monthly-dining-club',
    planType: 'monthly',
    name: 'Monthly Dining Club',
    price: 199,
    durationDays: 30,
    minOrder: 41,
    discountType: 'percentage',
    discountPercentage: 15,
    maxDiscount: 20,
    dailyLimit: 1,
    maxDiscountedOrders: 8,
    joiningBonusLoyalty: 10,
    loyaltyMultiplierMilestone: 15,
    milestones: [
      { orderNumber: 15, couponAmount: 10, title: '₹10 Milestone Bonus Coupon' },
      { orderNumber: 24, couponAmount: 10, title: '₹10 Milestone Bonus Coupon' }
    ],
    description: '15% OFF up to ₹20 • ₹41+ min order • 1/day • Bonus milestone coupons',
    features: [
      '30 Days',
      '15% OFF up to ₹20',
      '₹41+ minimum order',
      '1 discounted order per day',
      'Bonus milestone coupons',
      'Extra loyalty points'
    ]
  },
  {
    id: '3-month-dining-club',
    plan: '3-month-dining-club',
    planType: '3-month',
    name: '3-Month Dining Club',
    price: 499,
    durationDays: 90,
    minOrder: 41,
    discountType: 'percentage',
    discountPercentage: 15,
    maxDiscount: 20,
    dailyLimit: 1,
    maxDiscountedOrders: 20,
    joiningBonusLoyalty: 10,
    loyaltyMultiplierMilestone: 21,
    milestones: [
      { orderNumber: 25, couponAmount: 5, title: '₹5 Milestone Bonus Coupon' },
      { orderNumber: 28, couponAmount: 5, title: '₹5 Milestone Bonus Coupon' },
      { orderNumber: 35, couponAmount: 10, title: '₹10 Milestone Bonus Coupon' },
      { orderNumber: 40, couponAmount: 8, title: '₹8 Milestone Bonus Coupon' }
    ],
    description: '15% OFF up to ₹20 • ₹41+ min order • 1/day • Milestone coupons & loyalty boost',
    features: [
      '90 Days',
      '15% OFF up to ₹20',
      '₹41+ minimum order',
      '1 discounted order per day',
      'Milestone bonus coupons',
      'Extra loyalty points'
    ]
  }
];

/**
 * Returns date in YYYY-MM-DD string in Asia/Kolkata (IST) timezone
 */
export const getISTDateString = (date = new Date()) => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(date));
};

/**
 * Find plan by name, id, planType or legacy alias with backward compatibility
 */
export const findSubscriptionPlan = (rawPlan) => {
  if (!rawPlan) return null;
  const query = String(rawPlan).trim().toLowerCase();

  return SUBSCRIPTION_PLANS.find(p => {
    const name = p.name.toLowerCase();
    const id = p.id.toLowerCase();
    const plan = (p.plan || '').toLowerCase();
    const type = (p.planType || '').toLowerCase();

    // Exact matches
    if (name === query || id === query || plan === query || type === query) return true;

    // Weekly queries & legacy aliases
    if (
      (query.includes('weekly') || query.includes('snack')) &&
      type === 'weekly'
    ) {
      return true;
    }

    // 3-Month queries & legacy aliases (semester, 3-month, 90, 3 month)
    if (
      (query.includes('semester') || query.includes('3-month') || query.includes('3 month') || query.includes('three') || query.includes('90')) &&
      type === '3-month'
    ) {
      return true;
    }

    // Monthly queries & legacy aliases
    if (
      (query.includes('monthly') || query.includes('plus')) &&
      type === 'monthly'
    ) {
      return true;
    }

    return false;
  }) || null;
};
