import express from 'express';
import {
  listMerchandise,
  getMerchandiseById,
  createMerchandise,
  updateMerchandise,
  deleteMerchandise,
} from '../controllers/merchandiseController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

const merchandiseUploadFields = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'imageUrl', maxCount: 1 },
]);

router.get('/', listMerchandise);
router.get('/:id', getMerchandiseById);

router.post('/', protect, authorize('admin'), merchandiseUploadFields, createMerchandise);
router.put('/:id', protect, authorize('admin'), merchandiseUploadFields, updateMerchandise);
router.delete('/:id', protect, authorize('admin'), deleteMerchandise);

export default router;