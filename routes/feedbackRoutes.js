import express from 'express';
import {
  createFeedback,
  listFeedback,
  getFeedbackById,
  updateFeedbackStatus,
} from '../controllers/feedbackController.js';
import { protect, optionalAuth } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';

const router = express.Router();

router.post('/', optionalAuth, createFeedback);

router.get('/', protect, authorize('admin'), listFeedback);
router.get('/:id', protect, authorize('admin'), getFeedbackById);
router.put('/:id', protect, authorize('admin'), updateFeedbackStatus);

export default router;