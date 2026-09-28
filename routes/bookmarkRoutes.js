import express from 'express';
import {
  listMyBookmarks,
  createBookmark,
  updateBookmarkNote,
  deleteBookmark,
} from '../controllers/bookmarkController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', listMyBookmarks);
router.post('/', createBookmark);
router.put('/:id', updateBookmarkNote);
router.delete('/:id', deleteBookmark);

export default router;