import express from 'express';
import { handleChatMessage, getChatHistory, clearChatHistory } from '../controllers/chatController.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

router.post('/message', optionalAuth, handleChatMessage);
router.get('/history/:sessionId', optionalAuth, getChatHistory);
router.delete('/history/:sessionId', optionalAuth, clearChatHistory);

export default router;
