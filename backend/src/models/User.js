import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema(
  {
    plan: {
      type: String,
      enum: ['Weekly Snack Pass', 'Monthly Plus Membership', 'Semester Unlimited'],
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
