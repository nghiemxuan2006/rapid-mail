import express from 'express';
import { trackEmailOpenHandler } from '../controllers/tracking.controller';

const router = express.Router();

// Public: không có verifyToken. Request đến từ mail client của người nhận, không phải
// từ user đã đăng nhập.
router.get('/open/:token', trackEmailOpenHandler);

export default router;
