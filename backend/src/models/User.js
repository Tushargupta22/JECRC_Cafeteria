import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema(
  {
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
      default: null
    },
    plan: {
      type: String,
      enum: [
        'Weekly Dining Club',
        'Monthly Dining Club',
        '3-Month Dining Club',
        'Weekly Snack Pass',
        'Monthly Plus Membership',
        'Semester Unlimited',
        null
      ],
      default: null
    },
    planType: {
      type: String,
      enum: ['weekly', 'monthly', '3-month', 'semester', null],
      default: null
    },
    price: {
      type: Number,
      default: 0
    },
    discountPercentage: {
      type: Number,
      default: 0
    },
    discountAmount: {
      type: Number,
      default: 0
    },
    discountType: {
      type: String,
      enum: ['flat', 'percentage'],
      default: 'percentage'
    },
    minOrder: {
      type: Number,
      default: 31
    },
    maxDiscountPerOrder: {
      type: Number,
      default: 20
    },
    dailyLimit: {
      type: Number,
      default: 1
    },
    maxDiscountedOrders: {
      type: Number,
      default: 7
    },
    subscriptionUsageCount: {
      type: Number,
      default: 0
    },
    lastSubscriptionDiscountDate: {
      type: String,
      default: null
    },
    eligibleOrderCount: {
      type: Number,
      default: 0
    },
    milestonesAwarded: {
      type: [Number],
      default: []
    },
    loyaltyBonusAwarded: {
      type: Boolean,
      default: false
    },
    startDate: {
      type: Date,
      default: null
    },
    endDate: {
      type: Date,
      default: null
    },
    isActive: {
      type: Boolean,
      default: false
    }
  },
  { _id: false }
);


const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'User name is required'],
      trim: true
    },
    shortName: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false // Excluded by default so password hashes are never returned to frontend
    },
    role: {
      type: String,
      enum: ['user', 'student', 'admin'],
      default: 'student'
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    profileImage: {
      type: String,
      default: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300'
    },
    department: {
      type: String,
      default: 'B.Tech CS'
    },
    year: {
      type: String,
      default: 'Year 3'
    },
    studentId: {
      type: String,
      default: 'STU2026'
    },
    loyaltyPoints: {
      type: Number,
      default: 0,
      min: 0
    },
    totalOrders: {
      type: Number,
      default: 0,
      min: 0
    },
    totalSpent: {
      type: Number,
      default: 0,
      min: 0
    },
    subscription: {
      type: subscriptionSchema,
      default: () => ({})
    }
  },
  {
    timestamps: true
  }
);

// Method to safely return user object without password hash
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

const User = mongoose.model('User', userSchema);
export default User;
