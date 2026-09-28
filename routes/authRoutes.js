import express from 'express';
import {
  register,
  login,
  forgotPassword,
  verifyResetCode,
  resetPassword,
  verifyEmail,
  getMe,
  updateProfile,
  googleAuth,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js'; 

const router = express.Router();

router.post('/register', upload.single('avatar'), register);

router.post('/login', login);
router.post('/google', googleAuth);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyResetCode);
router.post('/reset-password', resetPassword);
router.get('/verify-email/:token', verifyEmail);
router.get('/me', protect, getMe);
router.put('/profile', protect, upload.single('avatar'), updateProfile);

export default router;