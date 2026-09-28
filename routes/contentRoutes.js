import express from 'express';
import {
  listContent,
  getContentById,
  createContent,
  updateContent,
  deleteContent,
  submitContent,
  approveContent,
  rejectContent,
  getPendingApprovals,
  getApprovalById,
  reactToContent,
  getMySubmissions,
} from '../controllers/contentController.js';
import { protect, optionalAuth } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';
import { uploadContentMedia } from '../middleware/upload.js';

const router = express.Router();

const contentUploadFields = uploadContentMedia.fields([
  { name: 'mediaUrl', maxCount: 1 },
  { name: 'mediaFile', maxCount: 10 },
  { name: 'mediaFiles', maxCount: 10 },
  { name: 'thumbnailUrl', maxCount: 1 },
  { name: 'thumbnailFile', maxCount: 1 },
]);

router.get('/pending', protect, authorize('admin'), getPendingApprovals);
router.get('/pending/:id', protect, authorize('admin'), getApprovalById);
router.get('/my-submissions', protect, getMySubmissions);
router.get('/', optionalAuth, listContent);
router.get('/:id', optionalAuth, getContentById);

router.post('/submit', protect, contentUploadFields, submitContent);

router.post('/', protect, authorize('admin'), contentUploadFields, createContent);
router.put('/:id', protect, authorize('admin'), contentUploadFields, updateContent);
router.delete('/:id', protect, authorize('admin'), deleteContent);

router.put('/:id/approve', protect, authorize('admin'), approveContent);
router.put('/:id/reject', protect, authorize('admin'), rejectContent);

router.post('/:id/react', protect, reactToContent);

export default router;