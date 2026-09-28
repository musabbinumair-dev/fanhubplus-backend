import express from 'express';
import {
  listEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
} from '../controllers/eventController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

const eventUploadFields = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'imageUrl', maxCount: 1 },
]);

router.get('/', listEvents);
router.get('/:id', getEventById);

router.post('/', protect, authorize('admin'), eventUploadFields, createEvent);
router.put('/:id', protect, authorize('admin'), eventUploadFields, updateEvent);
router.delete('/:id', protect, authorize('admin'), deleteEvent);

export default router;