import express from 'express';
import {
  getMyProfile,
  updateMyProfile,
  updateAvatar,
} from '../controllers/profileController.js';
import {
  listUsers,
  getUserById,
  createUser,
  updateUserRole,
  updateUserStatus,
  deleteUser,
} from '../controllers/userController.js';
import { getUserDashboard } from '../controllers/userDashboardController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';

const router = express.Router();

router.get('/dashboard', protect, getUserDashboard);

router.get('/me', protect, getMyProfile);
router.put('/me', protect, updateMyProfile);
router.put('/me/avatar', protect, updateAvatar);

router.get('/profile', protect, getMyProfile);
router.put('/profile', protect, updateMyProfile);
router.put('/profile/avatar', protect, updateAvatar);

router.get('/', protect, authorize('admin'), listUsers);
router.post('/', protect, authorize('admin'), createUser);
router.get('/:id', protect, authorize('admin'), getUserById);
router.put('/:id/role', protect, authorize('admin'), updateUserRole);
router.put('/:id/status', protect, authorize('admin'), updateUserStatus);
router.delete('/:id', protect, authorize('admin'), deleteUser);

export default router;