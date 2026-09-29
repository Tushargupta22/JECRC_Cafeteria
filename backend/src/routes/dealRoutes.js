import { Router } from 'express';
import {
  getPublicDeals,
  getTodaysHighlights,
  getPublicRewards,
  getPublicHighlightSettings,
  getActiveCoupons
} from '../controllers/ownerController.js';

const router = Router();

// Deals
router.get('/', getPublicDeals);
router.get('/active', (req, res, next) => {
  // Check the baseUrl to decide whether this is /api/deals/active, /api/rewards/active, or /api/coupons/active
  if (req.baseUrl.includes('rewards')) return getPublicRewards(req, res, next);
  if (req.baseUrl.includes('coupons')) return getActiveCoupons(req, res, next);
  return getPublicDeals(req, res, next);
});

// Highlights
router.get('/todays-highlights', getTodaysHighlights);
router.get('/highlights/settings', getPublicHighlightSettings);
router.get('/settings', getPublicHighlightSettings);

// Explicit sub-routes
router.get('/rewards/active', getPublicRewards);
router.get('/rewards', getPublicRewards);
router.get('/coupons/active', getActiveCoupons);
router.get('/coupons', getActiveCoupons);

export default router;
