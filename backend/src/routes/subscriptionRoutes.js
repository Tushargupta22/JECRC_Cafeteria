import { Router } from 'express';
import {
  getPlans,
  subscribe,
  getCurrentSubscription,
  cancelSubscription
} from '../controllers/subscriptionController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/plans', getPlans);
router.post('/subscribe', requireAuth, subscribe);
router.get('/current', requireAuth, getCurrentSubscription);
router.post('/cancel', requireAuth, cancelSubscription);

export default router;
