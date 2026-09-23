import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    foodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Food',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    stationTag: {
      type: String,
      default: 'Main Counter'
    },
    notes: {
      type: String,
      default: ''
    }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    customerName: {
      type: String,
      required: true
    },
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    tokenNumber: {
      type: String,
      default: '#01'
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: [val => val.length > 0, 'Order must contain at least one item']
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    discount: {
      type: Number,
      default: 0,
      min: 0
    },
    subscriptionDiscount: {
      type: Number,
      default: 0,
      min: 0
    },
    offerDiscount: {
      type: Number,
      default: 0,
      min: 0
    },
    couponCode: {
      type: String,
      default: null,
      uppercase: true,
      trim: true,
      index: true
    },
    offerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Offer',
      default: null
    },
    total: {
      type: Number,
      required: true,
      min: 0
    },
    paymentMethod: {
      type: String,
      enum: [
        'Campus UPI',
        'Campus UPI (Razorpay)',
        'UPI',
        'Razorpay',
        'Card',
        'Cash',
        'Meal Plan Balance',
        'Verified Paid'
      ],
      default: 'Campus UPI (Razorpay)'
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Paid', 'Failed', 'Refunded'],
      default: 'Paid'
    },
    orderStatus: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Completed', 'Cancelled'],
      default: 'Pending',
      index: true
    },
    loyaltyAwarded: {
      type: Boolean,
      default: false,
      index: true
    },
    etaMinutes: {
      type: Number,
      default: 8
    },
    station: {
      type: String,
      default: 'Counter 1'
    },
    note: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

const Order = mongoose.model('Order', orderSchema);
export default Order;
