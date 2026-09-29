import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    plan: {
      type: String,
      enum: [
        'Weekly Dining Club',
        'Monthly Dining Club',
        '3-Month Dining Club',
        'Weekly Snack Pass',
        'Monthly Plus Membership',
        'Semester Unlimited'
      ],
      required: [true, 'Subscription plan name is required']
    },
    planType: {
      type: String,
      enum: ['weekly', 'monthly', '3-month', 'semester'],
      required: true,
      index: true
    },
    price: {
      type: Number,
      required: [true, 'Subscription price is required'],
      min: 0
    },
    discountPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    discountType: {
      type: String,
      enum: ['flat', 'percentage'],
      default: 'percentage'
    },
    minOrder: {
      type: Number,
      default: 31,
      min: 0
    },
    maxDiscountPerOrder: {
      type: Number,
      default: 20,
      min: 0
    },
    dailyLimit: {
      type: Number,
      default: 1,
      min: 1
    },
    maxDiscountedOrders: {
      type: Number,
      default: 7,
      min: 1
    },
    // Counter A: Subscription discount usage
    subscriptionUsageCount: {
      type: Number,
      default: 0,
      min: 0
    },
    // Enforces 1-per-calendar-day rule (stored as YYYY-MM-DD in IST)
    lastSubscriptionDiscountDate: {
      type: String,
      default: null
    },
    // Counter B: Eligible order count (independent counter for milestones)
    eligibleOrderCount: {
      type: Number,
      default: 0,
      min: 0
    },
    // Tracks awarded milestone order numbers (e.g., [15, 24]) to prevent duplicate awards
    milestonesAwarded: {
      type: [Number],
      default: []
    },
    // Tracks if +10 joining loyalty points were awarded for this subscription
    loyaltyBonusAwarded: {
      type: Boolean,
      default: false
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required']
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Compound index to ensure we can efficiently query subscriptions by user and plan type
subscriptionSchema.index({ userId: 1, planType: 1 });

const Subscription = mongoose.model('Subscription', subscriptionSchema);
export default Subscription;

