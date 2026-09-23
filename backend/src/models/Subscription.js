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
      enum: ['Weekly Snack Pass', 'Monthly Plus Membership', 'Semester Unlimited'],
      required: [true, 'Subscription plan name is required']
    },
    planType: {
      type: String,
      enum: ['weekly', 'monthly', 'semester'],
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
      required: [true, 'Discount percentage is required'],
      min: 0,
      max: 100
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
