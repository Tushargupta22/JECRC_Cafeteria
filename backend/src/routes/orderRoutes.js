import { Router } from 'express';
import {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  clearAllOrders
} from '../controllers/orderController.js';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/', requireAuth, createOrder);
router.get('/', requireAuth, getOrders);
router.delete('/all', requireAuth, requireAdmin, clearAllOrders);
router.get('/:id', requireAuth, getOrderById);
router.put('/:id/status', requireAuth, requireAdmin, updateOrderStatus);

export default router;

