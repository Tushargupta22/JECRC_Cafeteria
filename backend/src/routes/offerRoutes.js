import { Router } from 'express';
import {
  getOffers,
  getOfferById,
  createOffer,
  updateOffer,
  deleteOffer,
  getPersonalized,
  validateCoupon
} from '../controllers/offerController.js';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', getOffers);
router.get('/personalized', requireAuth, getPersonalized);
router.post('/validate-coupon', requireAuth, validateCoupon);
router.get('/:id', getOfferById);
router.post('/', requireAuth, requireAdmin, createOffer);
router.put('/:id', requireAuth, requireAdmin, updateOffer);
router.delete('/:id', requireAuth, requireAdmin, deleteOffer);

export default router;
