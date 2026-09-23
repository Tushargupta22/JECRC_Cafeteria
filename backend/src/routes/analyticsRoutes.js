import { Router } from 'express';
import { getAdminAnalytics } from '../controllers/analyticsController.js';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', requireAuth, requireAdmin, getAdminAnalytics);

export default router;
