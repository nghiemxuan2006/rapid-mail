import express from 'express';
import { verifyToken } from '../middleware/verify-token';
import { getReplies, markReplyRead } from '../controllers/reply.controller';

const router = express.Router();

router.get('/', verifyToken, getReplies);
router.patch('/:id/read', verifyToken, markReplyRead);

export default router;
