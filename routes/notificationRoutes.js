import express from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
} from '../controllers/notificationController.js';
import { protect, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', optionalAuth, getNotifications);
router.put('/read-all', protect, markAllAsRead);
router.delete('/clear-all', protect, clearAllNotifications);
router.put('/:id/read', protect, markAsRead);
router.delete('/:id', protect, deleteNotification);

export default router;
