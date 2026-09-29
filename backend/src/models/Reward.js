import mongoose from 'mongoose';

const rewardSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Reward title is required'],
      trim: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    image: {
      type: String,
      default: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&q=80&w=400'
    },
    offerText: {
      type: String,
      required: [true, 'Offer text is required'],
      trim: true
    },
    rewardType: {
      type: String,
      enum: ['perk', 'voucher', 'free_item', 'combo'],
      default: 'perk',
      index: true
    },
    pointsCost: {
      type: Number,
      default: 0,
      min: [0, 'Points cost cannot be negative']
    },
    eligibility: {
      type: String,
      default: 'All students',
      trim: true
    },
    availableFor: {
      type: String,
      enum: ['normal', 'subscriber', 'both'],
      default: 'both',
      index: true
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

const Reward = mongoose.model('Reward', rewardSchema);
export default Reward;
