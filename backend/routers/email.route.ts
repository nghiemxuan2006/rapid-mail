import express from 'express';
import { submitEmail } from '../controllers/email.controller';
import { verifyToken } from '../middleware/verify-token';

const router = express.Router();

router.post('/', verifyToken, submitEmail);

export default router;
