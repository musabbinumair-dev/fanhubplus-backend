import express from 'express';
import { uploadMedia } from '../controllers/uploadController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/', protect, uploadMedia);

export default router;