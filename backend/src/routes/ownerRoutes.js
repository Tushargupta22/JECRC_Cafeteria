import { Router } from 'express';
import {
  ownerLogin,
  changeOwnerPassword,
  getOwnerProfile,
  getOwnerDashboardStats,
  getOwnerDeals,
  getOwnerDealById,
  createOwnerDeal,
  updateOwnerDeal,
  deleteOwnerDeal,
  getOwnerCoupons,
  createOwnerCoupon,
  updateOwnerCoupon,
  deleteOwnerCoupon,
  getOwnerRewards,
  createOwnerReward,
  updateOwnerReward,
  deleteOwnerReward,
  getOwnerHighlightSettings,
  updateOwnerHighlightSettings,
  uploadPromoImage,
  recoverOwnerAccount
} from '../controllers/ownerController.js';
import { requireAuth, requireOwner } from '../middleware/authMiddleware.js';

const router = Router();

// 1. Owner Authentication & Recovery
router.post('/login', ownerLogin);
router.put('/change-password', requireAuth, requireOwner, changeOwnerPassword);
router.post('/recover', recoverOwnerAccount);
router.get('/profile', requireAuth, requireOwner, getOwnerProfile);

// 2. Dashboard Stats
router.get('/dashboard', requireAuth, requireOwner, getOwnerDashboardStats);

// 3. Deals Management
router.get('/deals', requireAuth, requireOwner, getOwnerDeals);
router.post('/deals', requireAuth, requireOwner, createOwnerDeal);
router.get('/deals/:id', requireAuth, requireOwner, getOwnerDealById);
router.put('/deals/:id', requireAuth, requireOwner, updateOwnerDeal);
router.delete('/deals/:id', requireAuth, requireOwner, deleteOwnerDeal);

// 4. Coupons Management
router.get('/coupons', requireAuth, requireOwner, getOwnerCoupons);
router.post('/coupons', requireAuth, requireOwner, createOwnerCoupon);
router.put('/coupons/:id', requireAuth, requireOwner, updateOwnerCoupon);
router.delete('/coupons/:id', requireAuth, requireOwner, deleteOwnerCoupon);

// 5. Rewards & Perks Management
router.get('/rewards', requireAuth, requireOwner, getOwnerRewards);
router.post('/rewards', requireAuth, requireOwner, createOwnerReward);
router.put('/rewards/:id', requireAuth, requireOwner, updateOwnerReward);
router.delete('/rewards/:id', requireAuth, requireOwner, deleteOwnerReward);

// 6. Highlight Appearance Settings
router.get('/highlights/settings', requireAuth, requireOwner, getOwnerHighlightSettings);
router.put('/highlights/settings', requireAuth, requireOwner, updateOwnerHighlightSettings);

// 7. Secure Image Upload
router.post('/upload-image', requireAuth, requireOwner, uploadPromoImage);

export default router;
