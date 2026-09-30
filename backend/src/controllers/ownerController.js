import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import User from '../models/User.js';
import Deal from '../models/Deal.js';
import Offer from '../models/Offer.js';
import Reward from '../models/Reward.js';
import HighlightSettings from '../models/HighlightSettings.js';
import { generateToken } from '../utils/jwt.js';
import { uploadPromoImage as uploadPromoToStorage } from '../services/cloudinaryService.js';

// ==========================================
// 1. OWNER AUTHENTICATION & CREDENTIALS
// ==========================================

export const ownerLogin = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    const cleanInput = String(username).trim().toLowerCase();

    // Only allow users with explicit 'owner' role
    const owner = await User.findOne({
      role: 'owner',
      $or: [{ username: cleanInput }, { email: cleanInput }]
    }).select('+passwordHash');

    if (!owner) {
      return res.status(401).json({
        success: false,
        message: 'Invalid owner credentials'
      });
    }

    const isMatch = await bcrypt.compare(password, owner.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid owner credentials'
      });
    }

    const token = generateToken({
      id: owner._id,
      role: 'owner',
      username: owner.username
    });

    return res.status(200).json({
      success: true,
      message: 'Owner authenticated successfully',
      token,
      mustChangePassword: Boolean(owner.mustChangePassword),
      owner: {
        id: owner._id,
        name: owner.name,
        username: owner.username,
        email: owner.email,
        role: 'owner'
      }
    });
  } catch (error) {
    next(error);
  }
};

export const changeOwnerPassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password, new password, and confirmation are required'
      });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirmation do not match'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long'
      });
    }

    const defaultPass = process.env.OWNER_DEFAULT_PASSWORD || 'TTBrothers';
    if (newPassword === defaultPass) {
      return res.status(400).json({
        success: false,
        message: 'New password cannot be the default initial password'
      });
    }

    const owner = await User.findById(req.user._id).select('+passwordHash');
    if (!owner || owner.role !== 'owner') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized owner account access'
      });
    }

    const isCurrentValid = await bcrypt.compare(currentPassword, owner.passwordHash);
    if (!isCurrentValid) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect current password'
      });
    }

    const isSameAsCurrent = await bcrypt.compare(newPassword, owner.passwordHash);
    if (isSameAsCurrent) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password'
      });
    }

    const salt = await bcrypt.genSalt(10);
    owner.passwordHash = await bcrypt.hash(newPassword, salt);
    owner.mustChangePassword = false;
    await owner.save();

    return res.status(200).json({
      success: true,
      message: 'Owner password changed successfully. Security status updated.'
    });
  } catch (error) {
    next(error);
  }
};

export const recoverOwnerAccount = async (req, res, next) => {
  try {
    const { adminAccessCode } = req.body;
    const configuredKey = process.env.ADMIN_ACCESS_KEY;

    if (!configuredKey || !adminAccessCode || adminAccessCode.trim() !== configuredKey.trim()) {
      return res.status(403).json({
        success: false,
        message: 'Invalid administrative recovery credentials'
      });
    }

    const defaultPassword = process.env.OWNER_DEFAULT_PASSWORD || 'TTBrothers';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(defaultPassword, salt);

    let owner = await User.findOneAndUpdate(
      { $or: [{ role: 'owner' }, { username: 'owner' }] },
      {
        passwordHash,
        mustChangePassword: true,
        role: 'owner'
      },
      { new: true }
    );

    if (!owner) {
      owner = await User.create({
        name: 'Cafeteria Owner',
        username: 'owner',
        email: process.env.OWNER_EMAIL || 'owner@jecrc.edu',
        passwordHash,
        role: 'owner',
        mustChangePassword: true,
        phone: '9876543210'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Owner account successfully restored to initial security state with mandatory change password enabled.'
    });
  } catch (error) {
    next(error);
  }
};

export const getOwnerProfile = async (req, res, next) => {
  try {
    const owner = await User.findById(req.user._id).select('-passwordHash');
    if (!owner || owner.role !== 'owner') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized owner access'
      });
    }

    return res.status(200).json({
      success: true,
      owner: {
        id: owner._id,
        name: owner.name,
        username: owner.username,
        email: owner.email,
        role: 'owner',
        mustChangePassword: Boolean(owner.mustChangePassword)
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 2. DASHBOARD OVERVIEW & ANALYTICS
// ==========================================

export const getOwnerDashboardStats = async (req, res, next) => {
  try {
    const now = new Date();
    const in48Hours = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const [
      totalActiveDeals,
      totalActiveCoupons,
      totalActiveRewards,
      highlightedDeals,
      expiringDeals,
      expiringCoupons,
      expiringRewards,
      recentDeals,
      recentCoupons
    ] = await Promise.all([
      Deal.countDocuments({ isActive: true, expiryDate: { $gte: now } }),
      Offer.countDocuments({ isActive: true, validUntil: { $gte: now } }),
      Reward.countDocuments({ isActive: true, expiryDate: { $gte: now } }),
      Deal.countDocuments({ isActive: true, showInHighlights: true, expiryDate: { $gte: now } }),
      Deal.countDocuments({ isActive: true, expiryDate: { $gte: now, $lte: in48Hours } }),
      Offer.countDocuments({ isActive: true, validUntil: { $gte: now, $lte: in48Hours } }),
      Reward.countDocuments({ isActive: true, expiryDate: { $gte: now, $lte: in48Hours } }),
      Deal.find().sort({ createdAt: -1 }).limit(5),
      Offer.find().sort({ createdAt: -1 }).limit(5)
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        totalActiveDeals,
        totalActiveCoupons,
        totalActiveRewards,
        highlightedDeals,
        expiringPromotions: expiringDeals + expiringCoupons + expiringRewards
      },
      recentOffers: {
        deals: recentDeals,
        coupons: recentCoupons
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 3. DEALS MANAGEMENT
// ==========================================

export const getOwnerDeals = async (req, res, next) => {
  try {
    const deals = await Deal.find().sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      count: deals.length,
      deals
    });
  } catch (error) {
    next(error);
  }
};

export const getOwnerDealById = async (req, res, next) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) {
      return res.status(404).json({ success: false, message: 'Deal not found' });
    }
    return res.status(200).json({ success: true, deal });
  } catch (error) {
    next(error);
  }
};

export const createOwnerDeal = async (req, res, next) => {
  try {
    const {
      title,
      description,
      image,
      originalPrice,
      discountedPrice,
      startDate,
      expiryDate,
      isActive,
      showInHighlights,
      availableFor
    } = req.body;

    if (!title || !originalPrice || !discountedPrice || !expiryDate) {
      return res.status(400).json({
        success: false,
        message: 'Title, original price, discounted price, and expiry date are required'
      });
    }

    const numOriginal = Number(originalPrice);
    const numDiscounted = Number(discountedPrice);

    if (numDiscounted <= 0 || numOriginal <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Prices must be greater than zero'
      });
    }

    if (numDiscounted >= numOriginal) {
      return res.status(400).json({
        success: false,
        message: 'Discounted price must be less than the original price'
      });
    }

    const discountPercentage = Math.round(((numOriginal - numDiscounted) / numOriginal) * 100);

    const deal = await Deal.create({
      title: String(title).trim(),
      description: description ? String(description).trim() : '',
      image: image || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=600',
      originalPrice: numOriginal,
      discountedPrice: numDiscounted,
      discountPercentage,
      startDate: startDate ? new Date(startDate) : new Date(),
      expiryDate: new Date(expiryDate),
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      showInHighlights: Boolean(showInHighlights),
      availableFor: ['normal', 'subscriber', 'both'].includes(availableFor) ? availableFor : 'both',
      createdBy: req.user._id
    });

    return res.status(201).json({
      success: true,
      message: 'Deal created successfully',
      deal
    });
  } catch (error) {
    next(error);
  }
};

export const updateOwnerDeal = async (req, res, next) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) {
      return res.status(404).json({ success: false, message: 'Deal not found' });
    }

    const {
      title,
      description,
      image,
      originalPrice,
      discountedPrice,
      startDate,
      expiryDate,
      isActive,
      showInHighlights,
      availableFor
    } = req.body;

    if (title !== undefined) deal.title = String(title).trim();
    if (description !== undefined) deal.description = String(description).trim();
    if (image !== undefined) deal.image = image;
    if (startDate !== undefined) deal.startDate = new Date(startDate);
    if (expiryDate !== undefined) deal.expiryDate = new Date(expiryDate);
    if (isActive !== undefined) deal.isActive = Boolean(isActive);
    if (showInHighlights !== undefined) deal.showInHighlights = Boolean(showInHighlights);
    if (availableFor !== undefined && ['normal', 'subscriber', 'both'].includes(availableFor)) {
      deal.availableFor = availableFor;
    }

    const orig = originalPrice !== undefined ? Number(originalPrice) : deal.originalPrice;
    const disc = discountedPrice !== undefined ? Number(discountedPrice) : deal.discountedPrice;

    if (disc <= 0 || orig <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Prices must be greater than zero'
      });
    }

    if (disc >= orig) {
      return res.status(400).json({
        success: false,
        message: 'Discounted price must be less than the original price'
      });
    }

    deal.originalPrice = orig;
    deal.discountedPrice = disc;
    deal.discountPercentage = Math.round(((orig - disc) / orig) * 100);

    await deal.save();

    return res.status(200).json({
      success: true,
      message: 'Deal updated successfully',
      deal
    });
  } catch (error) {
    next(error);
  }
};

export const deleteOwnerDeal = async (req, res, next) => {
  try {
    const deal = await Deal.findByIdAndDelete(req.params.id);
    if (!deal) {
      return res.status(404).json({ success: false, message: 'Deal not found' });
    }
    return res.status(200).json({
      success: true,
      message: 'Deal deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 4. COUPONS MANAGEMENT
// ==========================================

export const getOwnerCoupons = async (req, res, next) => {
  try {
    const coupons = await Offer.find().sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      count: coupons.length,
      coupons
    });
  } catch (error) {
    next(error);
  }
};

export const createOwnerCoupon = async (req, res, next) => {
  try {
    const {
      couponName,
      couponCode,
      description,
      discountType,
      discountValue,
      minimumOrderValue,
      maxDiscount,
      totalUsageLimit,
      perUserUsageLimit,
      startDate,
      expiryDate,
      availableFor,
      applicableMembershipPlans,
      isActive
    } = req.body;

    if (!couponCode || discountValue === undefined || !expiryDate) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code, discount value, and expiry date are required'
      });
    }

    const cleanCode = String(couponCode).trim().toUpperCase();

    const existing = await Offer.findOne({ couponCode: cleanCode });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Coupon code "${cleanCode}" already exists`
      });
    }

    const discNum = Number(discountValue);
    if (discNum <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Discount value must be greater than zero'
      });
    }

    const discType = discountType === 'fixed' || discountType === 'flat' ? 'fixed' : 'percentage';
    if (discType === 'percentage' && discNum > 100) {
      return res.status(400).json({
        success: false,
        message: 'Percentage discount cannot exceed 100%'
      });
    }

    const audience = ['normal', 'subscriber', 'both'].includes(availableFor) ? availableFor : 'both';
    let targetAudience = 'all';
    if (audience === 'normal') targetAudience = 'students';
    if (audience === 'subscriber') targetAudience = 'subscribers';

    const coupon = await Offer.create({
      title: couponName ? String(couponName).trim() : cleanCode,
      couponCode: cleanCode,
      description: description ? String(description).trim() : '',
      discountType: discType,
      discount: discNum,
      minimumOrder: minimumOrderValue ? Number(minimumOrderValue) : 0,
      maxDiscount: maxDiscount ? Number(maxDiscount) : null,
      usageLimit: totalUsageLimit ? Number(totalUsageLimit) : null,
      perUserLimit: perUserUsageLimit ? Number(perUserUsageLimit) : 1,
      validFrom: startDate ? new Date(startDate) : new Date(),
      validUntil: new Date(expiryDate),
      availableFor: audience,
      targetAudience,
      subscriptionRequirement: audience === 'subscriber',
      applicableMembershipPlans: Array.isArray(applicableMembershipPlans) ? applicableMembershipPlans : [],
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      createdBy: req.user._id
    });

    return res.status(201).json({
      success: true,
      message: 'Coupon created successfully',
      coupon
    });
  } catch (error) {
    next(error);
  }
};

export const updateOwnerCoupon = async (req, res, next) => {
  try {
    const coupon = await Offer.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }

    const {
      couponName,
      couponCode,
      description,
      discountType,
      discountValue,
      minimumOrderValue,
      maxDiscount,
      totalUsageLimit,
      perUserUsageLimit,
      startDate,
      expiryDate,
      availableFor,
      applicableMembershipPlans,
      isActive
    } = req.body;

    if (couponCode) {
      const cleanCode = String(couponCode).trim().toUpperCase();
      if (cleanCode !== coupon.couponCode) {
        const existing = await Offer.findOne({ couponCode: cleanCode });
        if (existing) {
          return res.status(400).json({
            success: false,
            message: `Coupon code "${cleanCode}" is already in use`
          });
        }
        coupon.couponCode = cleanCode;
      }
    }

    if (couponName !== undefined) coupon.title = String(couponName).trim();
    if (description !== undefined) coupon.description = String(description).trim();
    if (discountType !== undefined) {
      coupon.discountType = discountType === 'fixed' || discountType === 'flat' ? 'fixed' : 'percentage';
    }
    if (discountValue !== undefined) {
      const disc = Number(discountValue);
      if (disc <= 0) {
        return res.status(400).json({ success: false, message: 'Discount value must be greater than zero' });
      }
      if (coupon.discountType === 'percentage' && disc > 100) {
        return res.status(400).json({ success: false, message: 'Percentage discount cannot exceed 100%' });
      }
      coupon.discount = disc;
    }
    if (minimumOrderValue !== undefined) coupon.minimumOrder = Number(minimumOrderValue);
    if (maxDiscount !== undefined) coupon.maxDiscount = maxDiscount ? Number(maxDiscount) : null;
    if (totalUsageLimit !== undefined) coupon.usageLimit = totalUsageLimit ? Number(totalUsageLimit) : null;
    if (perUserUsageLimit !== undefined) coupon.perUserLimit = Number(perUserUsageLimit) || 1;
    if (startDate !== undefined) coupon.validFrom = new Date(startDate);
    if (expiryDate !== undefined) coupon.validUntil = new Date(expiryDate);
    if (isActive !== undefined) coupon.isActive = Boolean(isActive);

    if (availableFor !== undefined && ['normal', 'subscriber', 'both'].includes(availableFor)) {
      coupon.availableFor = availableFor;
      coupon.subscriptionRequirement = availableFor === 'subscriber';
      coupon.targetAudience = availableFor === 'subscriber' ? 'subscribers' : availableFor === 'normal' ? 'students' : 'all';
    }

    if (applicableMembershipPlans !== undefined && Array.isArray(applicableMembershipPlans)) {
      coupon.applicableMembershipPlans = applicableMembershipPlans;
    }

    await coupon.save();

    return res.status(200).json({
      success: true,
      message: 'Coupon updated successfully',
      coupon
    });
  } catch (error) {
    next(error);
  }
};

export const deleteOwnerCoupon = async (req, res, next) => {
  try {
    const coupon = await Offer.findByIdAndDelete(req.params.id);
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }
    return res.status(200).json({
      success: true,
      message: 'Coupon deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 5. REWARDS & PERKS MANAGEMENT
// ==========================================

export const getOwnerRewards = async (req, res, next) => {
  try {
    const rewards = await Reward.find().sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      count: rewards.length,
      rewards
    });
  } catch (error) {
    next(error);
  }
};

export const createOwnerReward = async (req, res, next) => {
  try {
    const {
      title,
      description,
      image,
      offerText,
      rewardType,
      pointsCost,
      eligibility,
      availableFor,
      startDate,
      expiryDate,
      isActive
    } = req.body;

    if (!title || !offerText || !expiryDate) {
      return res.status(400).json({
        success: false,
        message: 'Title, offer text, and expiry date are required'
      });
    }

    const reward = await Reward.create({
      title: String(title).trim(),
      description: description ? String(description).trim() : '',
      image: image || 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&q=80&w=400',
      offerText: String(offerText).trim(),
      rewardType: ['perk', 'voucher', 'free_item', 'combo'].includes(rewardType) ? rewardType : 'perk',
      pointsCost: pointsCost ? Math.max(0, Number(pointsCost)) : 0,
      eligibility: eligibility ? String(eligibility).trim() : 'All students',
      availableFor: ['normal', 'subscriber', 'both'].includes(availableFor) ? availableFor : 'both',
      startDate: startDate ? new Date(startDate) : new Date(),
      expiryDate: new Date(expiryDate),
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      createdBy: req.user._id
    });

    return res.status(201).json({
      success: true,
      message: 'Reward / Perk created successfully',
      reward
    });
  } catch (error) {
    next(error);
  }
};

export const updateOwnerReward = async (req, res, next) => {
  try {
    const reward = await Reward.findById(req.params.id);
    if (!reward) {
      return res.status(404).json({ success: false, message: 'Reward not found' });
    }

    const {
      title,
      description,
      image,
      offerText,
      rewardType,
      pointsCost,
      eligibility,
      availableFor,
      startDate,
      expiryDate,
      isActive
    } = req.body;

    if (title !== undefined) reward.title = String(title).trim();
    if (description !== undefined) reward.description = String(description).trim();
    if (image !== undefined) reward.image = image;
    if (offerText !== undefined) reward.offerText = String(offerText).trim();
    if (rewardType !== undefined && ['perk', 'voucher', 'free_item', 'combo'].includes(rewardType)) {
      reward.rewardType = rewardType;
    }
    if (pointsCost !== undefined) reward.pointsCost = Math.max(0, Number(pointsCost));
    if (eligibility !== undefined) reward.eligibility = String(eligibility).trim();
    if (availableFor !== undefined && ['normal', 'subscriber', 'both'].includes(availableFor)) {
      reward.availableFor = availableFor;
    }
    if (startDate !== undefined) reward.startDate = new Date(startDate);
    if (expiryDate !== undefined) reward.expiryDate = new Date(expiryDate);
    if (isActive !== undefined) reward.isActive = Boolean(isActive);

    await reward.save();

    return res.status(200).json({
      success: true,
      message: 'Reward / Perk updated successfully',
      reward
    });
  } catch (error) {
    next(error);
  }
};

export const deleteOwnerReward = async (req, res, next) => {
  try {
    const reward = await Reward.findByIdAndDelete(req.params.id);
    if (!reward) {
      return res.status(404).json({ success: false, message: 'Reward not found' });
    }
    return res.status(200).json({
      success: true,
      message: 'Reward / Perk deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 6. HIGHLIGHT APPEARANCE SETTINGS
// ==========================================

export const getOwnerHighlightSettings = async (req, res, next) => {
  try {
    let settings = await HighlightSettings.findOne();
    if (!settings) {
      settings = await HighlightSettings.create({
        overlayEnabled: true,
        overlayIntensity: 'medium',
        heading: "Today's Special Highlights",
        subtitle: "Chef's curated picks with exclusive campus discounts",
        badgeText: "Chef's Special",
        ctaText: "Order Now"
      });
    }
    return res.status(200).json({
      success: true,
      settings
    });
  } catch (error) {
    next(error);
  }
};

export const updateOwnerHighlightSettings = async (req, res, next) => {
  try {
    const { overlayEnabled, overlayIntensity, heading, subtitle, badgeText, ctaText, backgroundImage } = req.body;

    let settings = await HighlightSettings.findOne();
    if (!settings) {
      settings = new HighlightSettings({});
    }

    if (overlayEnabled !== undefined) settings.overlayEnabled = Boolean(overlayEnabled);
    if (overlayIntensity !== undefined && ['light', 'medium', 'dark', 'strong'].includes(overlayIntensity)) {
      settings.overlayIntensity = overlayIntensity;
    }
    if (heading !== undefined) settings.heading = String(heading).trim();
    if (subtitle !== undefined) settings.subtitle = String(subtitle).trim();
    if (badgeText !== undefined) settings.badgeText = String(badgeText).trim();
    if (ctaText !== undefined) settings.ctaText = String(ctaText).trim();
    if (backgroundImage !== undefined) settings.backgroundImage = String(backgroundImage).trim();

    settings.updatedBy = req.user._id;
    await settings.save();

    return res.status(200).json({
      success: true,
      message: 'Highlight settings updated successfully',
      settings
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 7. PROMO IMAGE UPLOAD (SECURE & PERSISTENT)
// ==========================================

export const uploadPromoImage = async (req, res, next) => {
  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        message: 'No image data provided'
      });
    }

    const uploadResult = await uploadPromoToStorage(imageBase64, req);

    return res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      imageUrl: uploadResult.imageUrl,
      provider: uploadResult.provider
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};


// ==========================================
// 8. PUBLIC / STUDENT-FACING PROMOTIONS
// ==========================================

export const getPublicDeals = async (req, res, next) => {
  try {
    const now = new Date();
    const query = {
      isActive: true,
      startDate: { $lte: now },
      expiryDate: { $gte: now }
    };

    const deals = await Deal.find(query).sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      count: deals.length,
      deals
    });
  } catch (error) {
    next(error);
  }
};

export const getTodaysHighlights = async (req, res, next) => {
  try {
    const now = new Date();
    const query = {
      isActive: true,
      showInHighlights: true,
      startDate: { $lte: now },
      expiryDate: { $gte: now }
    };

    const deals = await Deal.find(query).sort({ createdAt: -1 });
    const settings = await HighlightSettings.findOne();

    return res.status(200).json({
      success: true,
      count: deals.length,
      deals,
      settings: settings || {
        overlayEnabled: true,
        overlayIntensity: 'medium',
        heading: "Today's Special Highlights",
        subtitle: "Chef's curated picks with exclusive campus discounts",
        badgeText: "Chef's Special",
        ctaText: "Order Now"
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getPublicRewards = async (req, res, next) => {
  try {
    const now = new Date();
    const query = {
      isActive: true,
      startDate: { $lte: now },
      expiryDate: { $gte: now }
    };

    const rewards = await Reward.find(query).sort({ pointsCost: 1, createdAt: -1 });
    return res.status(200).json({
      success: true,
      count: rewards.length,
      rewards
    });
  } catch (error) {
    next(error);
  }
};

export const getPublicHighlightSettings = async (req, res, next) => {
  try {
    let settings = await HighlightSettings.findOne();
    if (!settings) {
      settings = {
        overlayEnabled: true,
        overlayIntensity: 'medium',
        heading: "Today's Special Highlights",
        subtitle: "Chef's curated picks with exclusive campus discounts",
        badgeText: "Chef's Special",
        ctaText: "Order Now"
      };
    }
    return res.status(200).json({
      success: true,
      settings
    });
  } catch (error) {
    next(error);
  }
};

export const getActiveCoupons = async (req, res, next) => {
  try {
    const now = new Date();
    const coupons = await Offer.find({
      isActive: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now }
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: coupons.length,
      coupons
    });
  } catch (error) {
    next(error);
  }
};
