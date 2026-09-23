import Order from '../models/Order.js';
import Offer from '../models/Offer.js';
import Food from '../models/Food.js';
import { calculateOrderPricing } from '../services/orderService.js';
import { awardLoyaltyForOrder } from '../services/loyaltyService.js';

export const createOrder = async (req, res, next) => {
  try {
    const { items, paymentMethod, couponCode, note } = req.body;

    console.log('[Order] Creating order with items:', JSON.stringify(items, null, 2));

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must contain at least one item'
      });
    }

    // Server-side price calculation and validation
    const pricing = await calculateOrderPricing({
      items,
      user: req.user,
      couponCode
    });

    console.log('[Order] User subscription:', req.user.subscription);
    console.log('[Order] Subscription discount:', pricing.subscriptionDiscount);
    console.log('[Order] Subtotal:', pricing.subtotal);
    console.log('[Order] Total after discount:', pricing.total);

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const tokenNum = Math.floor(10 + Math.random() * 89);
    const orderNumber = `#CB${randomSuffix}`;
    const tokenNumber = `#${tokenNum}`;

    // Normalize payment method to supported enum
    const validMethods = [
      'Campus UPI',
      'Campus UPI (Razorpay)',
      'UPI',
      'Razorpay',
      'Card',
      'Cash',
      'Meal Plan Balance',
      'Verified Paid'
    ];
    let resolvedPaymentMethod = paymentMethod || 'Campus UPI (Razorpay)';
    if (!validMethods.includes(resolvedPaymentMethod)) {
      if (typeof resolvedPaymentMethod === 'string' && (resolvedPaymentMethod.toLowerCase().includes('upi') || resolvedPaymentMethod.toLowerCase().includes('razorpay'))) {
        resolvedPaymentMethod = 'Campus UPI (Razorpay)';
      } else {
        resolvedPaymentMethod = 'Campus UPI';
      }
    }

    const appliedCouponCode = pricing.appliedOffer
      ? pricing.appliedOffer.couponCode
      : couponCode
      ? String(couponCode).trim().toUpperCase()
      : null;

    // Atomically decrement stock in MongoDB to prevent overselling
    const successfullyDecremented = [];
    try {
      for (const item of pricing.verifiedItems) {
        const updatedFood = await Food.findOneAndUpdate(
          {
            _id: item.foodId,
            isAvailable: true,
            stockCount: { $gte: item.quantity }
          },
          {
            $inc: { stockCount: -item.quantity }
          },
          { new: true }
        );

        if (!updatedFood) {
          throw new Error(`This item is currently out of stock or has insufficient quantity: "${item.name}". Please adjust your cart.`);
        }

        successfullyDecremented.push({ foodId: item.foodId, quantity: item.quantity });

        // If stock hit 0, automatically mark as out of stock
        if (updatedFood.stockCount <= 0) {
          await Food.findByIdAndUpdate(item.foodId, { isAvailable: false, stockCount: 0 });
        }
      }
    } catch (stockError) {
      // Rollback any successfully decremented items in this transaction
      for (const dec of successfullyDecremented) {
        await Food.findByIdAndUpdate(dec.foodId, {
          $inc: { stockCount: dec.quantity },
          isAvailable: true
        });
      }
      return res.status(400).json({
        success: false,
        message: stockError.message || 'This item is currently out of stock. Please adjust your cart.'
      });
    }

    const order = await Order.create({
      userId: req.user._id,
      customerName: req.user.name,
      orderNumber,
      tokenNumber,
      items: pricing.verifiedItems,
      subtotal: pricing.subtotal,
      discount: pricing.discount,
      subscriptionDiscount: pricing.subscriptionDiscount,
      offerDiscount: pricing.offerDiscount,
      couponCode: appliedCouponCode,
      offerId: pricing.appliedOffer?._id || null,
      total: pricing.total,
      paymentMethod: resolvedPaymentMethod,
      paymentStatus: 'Paid',
      orderStatus: 'Pending',
      loyaltyAwarded: false,
      etaMinutes: 8,
      station: pricing.verifiedItems[0]?.stationTag || 'Counter 1',
      note: note || ''
    });

    // Record coupon usage for the user
    if (pricing.appliedOffer) {
      await Offer.findByIdAndUpdate(pricing.appliedOffer._id, {
        $inc: { timesUsed: 1 },
        $push: {
          usedBy: {
            userId: req.user._id,
            orderId: order._id,
            usedAt: new Date()
          }
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Order created and payment verified successfully',
      order
    });
  } catch (error) {
    next(error);
  }
};

export const getOrders = async (req, res, next) => {
  try {
    const { status, station } = req.query;
    const filter = {};

    // Regular users can only see their own orders; admins see all
    if (req.user.role !== 'admin') {
      filter.userId = req.user._id;
    }

    if (status && status !== 'all') {
      filter.orderStatus = status;
    }

    if (station && station !== 'all') {
      filter.station = new RegExp(station, 'i');
    }

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .populate('userId', 'name email department year studentId profileImage');

    res.status(200).json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    next(error);
  }
};

export const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      'userId',
      'name email department year studentId profileImage'
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check authorization: user can only access own order, admin can access any
    if (req.user.role !== 'admin' && order.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to view this order'
      });
    }

    res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus = async (req, res, next) => {
  try {
    const status = req.body.status || req.body.orderStatus;
    const allowedStatuses = ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Completed', 'Cancelled'];

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid order status. Must be one of: ${allowedStatuses.join(', ')}`
      });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (status === 'Cancelled' && order.orderStatus !== 'Cancelled') {
      for (const item of order.items) {
        await Food.findByIdAndUpdate(item.foodId, {
          $inc: { stockCount: item.quantity },
          isAvailable: true
        });
      }
    }

    order.orderStatus = status;

    let loyaltyResult = null;
    if (status === 'Completed') {
      // Award loyalty points with idempotency protection
      loyaltyResult = await awardLoyaltyForOrder(order);
    } else {
      await order.save();
    }

    res.status(200).json({
      success: true,
      message: `Order status successfully updated to "${status}"`,
      order,
      loyalty: loyaltyResult
    });
  } catch (error) {
    next(error);
  }
};

export const clearAllOrders = async (req, res, next) => {
  try {
    const result = await Order.deleteMany({});
    res.status(200).json({
      success: true,
      message: `Cleared ${result.deletedCount} orders`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    next(error);
  }
};
