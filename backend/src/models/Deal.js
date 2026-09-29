import mongoose from 'mongoose';

const dealSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Deal title is required'],
      trim: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    image: {
      type: String,
      default: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=600'
    },
    originalPrice: {
      type: Number,
      required: [true, 'Original price is required'],
      min: [1, 'Original price must be greater than 0']
    },
    discountedPrice: {
      type: Number,
      required: [true, 'Discounted price is required'],
      min: [1, 'Discounted price must be greater than 0']
    },
    discountPercentage: {
      type: Number,
      default: 0
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    expiryDate: {
      type: Date,
      required: [true, 'Expiry date is required']
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    showInHighlights: {
      type: Boolean,
      default: false,
      index: true
    },
    availableFor: {
      type: String,
      enum: ['normal', 'subscriber', 'both'],
      default: 'both',
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook to calculate discount percentage and validate price relationship
dealSchema.pre('save', function (next) {
  if (this.originalPrice && this.discountedPrice) {
    if (this.discountedPrice >= this.originalPrice) {
      return next(new Error('Discounted price must be less than the original price'));
    }
    this.discountPercentage = Math.round(
      ((this.originalPrice - this.discountedPrice) / this.originalPrice) * 100
    );
  }
  next();
});

const Deal = mongoose.model('Deal', dealSchema);
export default Deal;
