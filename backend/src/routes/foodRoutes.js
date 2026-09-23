import { Router } from 'express';
import {
  getFoods,
  getFoodById,
  createFood,
  updateFood,
  deleteFood
} from '../controllers/foodController.js';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', getFoods);
router.get('/:id', getFoodById);
router.post('/', requireAuth, requireAdmin, createFood);
router.put('/:id', requireAuth, requireAdmin, updateFood);
router.delete('/:id', requireAuth, requireAdmin, deleteFood);

export default router;
