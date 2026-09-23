import Offer from '../models/Offer.js';
import { getPersonalizedOffers } from '../services/personalizationService.js';
import { validateAndCalculateCoupon } from '../services/couponService.js';

export const getOffers = async (req, res, next) => {
  try {
    const { includeInactive } = req.query;
    const filter = {};

    // Regular users see only active offers within valid date range
    if (!includeInactive || req.user?.role !== 'admin') {
      const now = new Date();
      filter.isActive = true;
      filter.validFrom = { $lte: now };
      filter.validUntil = { $gte: now };
    }

    const offers = await Offer.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: offers.length,
      offers
    });
  } catch (error) {
    next(error);
  }
};

export const getOfferById = async (req, res, next) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }

    res.status(200).json({
      success: true,
      offer
    });
  } catch (error) {
    next(error);
  }
};

export const createOffer = async (req, res, next) => {
  try {
    const {
      title,
      description,
      discount,
      discountType,
      image,
      couponCode,
      validFrom,
      validUntil,
      targetAudience,
      isActive
    } = req.body;

    if (!title || discount === undefined || !couponCode || !validUntil) {
      return res.status(400).json({
        success: false,
        message: 'Title, discount, couponCode, and validUntil are required fields'
      });
    }

    const offer = await Offer.create({
      title,
      description,
      discount: Number(discount),
      discountType: discountType || 'percentage',
      image,
      couponCode: couponCode.trim().toUpperCase(),
      validFrom: validFrom ? new Date(validFrom) : new Date(),
      validUntil: new Date(validUntil),
      targetAudience: targetAudience || 'all',
      isActive: isActive !== undefined ? Boolean(isActive) : true
    });

    res.status(201).json({
      success: true,
      message: 'Offer created successfully',
      offer
    });
  } catch (error) {
    next(error);
  }
};

export const updateOffer = async (req, res, next) => {
  try {
    if (req.body.couponCode) {
      req.body.couponCode = req.body.couponCode.trim().toUpperCase();
    }

    const offer = await Offer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Offer updated successfully',
      offer
    });
  } catch (error) {
    next(error);
  }
};

export const deleteOffer = async (req, res, next) => {
  try {
    const offer = await Offer.findByIdAndDelete(req.params.id);

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Offer deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getPersonalized = async (req, res, next) => {
  try {
    const result = await getPersonalizedOffers(req.user._id);

    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
};

export const validateCoupon = async (req, res, next) => {
  try {
    const { couponCode, items, subtotal } = req.body;
    const result = await validateAndCalculateCoupon({
      couponCode,
      user: req.user,
      items: items || [],
      subtotal: subtotal || 0
    });

    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(error.statusCode || 400).json({
      success: false,
      valid: false,
      message: error.message || 'Invalid or ineligible coupon'
    });
  }
};
