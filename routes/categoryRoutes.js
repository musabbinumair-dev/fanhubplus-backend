import express from 'express';
import {
  listCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/categoryController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.get('/', listCategories);
router.get('/:id', getCategoryById);

router.post(
  '/',
  upload.single('icon'),
  protect,
  authorize('admin'),
  createCategory
);

router.put(
  '/:id',
  upload.single('icon'),
  protect,
  authorize('admin'),
  updateCategory
);

router.delete('/:id', protect, authorize('admin'), deleteCategory);

export default router;