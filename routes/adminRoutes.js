import express from 'express';
import { getAdminStats } from '../controllers/dashboardController.js';
import {
  getPendingApprovals,
  getApprovalById,
  approveContent,
  rejectContent,
} from '../controllers/contentController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';

const router = express.Router();

router.get('/stats', protect, authorize('admin'), getAdminStats);
router.get('/approvals', protect, authorize('admin'), getPendingApprovals);
router.get('/approvals/:id', protect, authorize('admin'), getApprovalById);
router.put('/approvals/:id/approve', protect, authorize('admin'), approveContent);
router.put('/approvals/:id/reject', protect, authorize('admin'), rejectContent);

export default router;