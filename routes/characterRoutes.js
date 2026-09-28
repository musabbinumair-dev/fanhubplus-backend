import express from 'express';
import {
  listCharacters,
  getCharacterById,
  createCharacter,
  updateCharacter,
  deleteCharacter,
} from '../controllers/characterController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

const characterUploadFields = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'imageUrl', maxCount: 1 },
]);

router.get('/', listCharacters);
router.get('/:id', getCharacterById);

router.post('/', protect, authorize('admin'), characterUploadFields, createCharacter);
router.put('/:id', protect, authorize('admin'), characterUploadFields, updateCharacter);
router.delete('/:id', protect, authorize('admin'), deleteCharacter);

export default router;