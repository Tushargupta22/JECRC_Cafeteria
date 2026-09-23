import { Router } from 'express';
import { register, login, getMe, logout, forgotPassword, updateProfile, uploadAvatar } from '../controllers/authController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', forgotPassword);
router.get('/me', requireAuth, getMe);
router.put('/profile', requireAuth, updateProfile);
router.post('/upload-avatar', requireAuth, uploadAvatar);
router.post('/logout', logout);

export default router;
