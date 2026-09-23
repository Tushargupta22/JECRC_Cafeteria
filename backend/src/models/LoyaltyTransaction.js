import mongoose from 'mongoose';

const loyaltyTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    points: {
      type: Number,
      required: true
    },
    type: {
      type: String,
      enum: ['earned', 'redeemed', 'bonus'],
      required: true
    },
    reason: {
      type: String,
      default: ''
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: false
  }
);

const LoyaltyTransaction = mongoose.model('LoyaltyTransaction', loyaltyTransactionSchema);
export default LoyaltyTransaction;
