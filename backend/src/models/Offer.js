import mongoose from 'mongoose';

const offerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Offer title is required'],
      trim: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    discount: {
      type: Number,
      required: [true, 'Discount value is required'],
      min: 0
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'percentage'
    },
    image: {
      type: String,
      default: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=400'
    },
    couponCode: {
      type: String,
      required: [true, 'Coupon code is required'],
      unique: true,
      uppercase: true,
      trim: true
    },
    validFrom: {
      type: Date,
      default: Date.now
    },
    validUntil: {
      type: Date,
      required: [true, 'Offer valid until date is required']
    },
    targetAudience: {
      type: String,
      enum: [
        'all',
        'students',
        'subscribers',
        'frequent_coffee',
        'frequent_burgers',
        'frequent_chai',
        'frequent_snacks',
        'frequent_item',
        'high_spenders',
        'inactive_users',
        'new_users'
      ],
      default: 'all'
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    minimumOrder: {
      type: Number,
      default: 0,
      min: 0
    },
    applicableCategory: {
      type: String,
      default: null,
      trim: true
    },
    applicableFoodName: {
      type: String,
      default: null,
      trim: true
    },
    usageLimit: {
      type: Number,
      default: null
    },
    perUserLimit: {
      type: Number,
      default: 1,
      min: 1
    },
    timesUsed: {
      type: Number,
      default: 0,
      min: 0
    },
    usedBy: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        orderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Order'
        },
        usedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    subscriptionRequirement: {
      type: Boolean,
      default: false
    },
    recommendationReason: {
      type: String,
      default: '',
      trim: true
    },
    badgeText: {
      type: String,
      default: 'Personal Perk',
      trim: true
    },
    icon: {
      type: String,
      default: '🎁',
      trim: true
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

const Offer = mongoose.model('Offer', offerSchema);
export default Offer;
