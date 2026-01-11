import express from 'express';
import { submitEmail, submitMultipleEmails } from '../controllers/email.controller';
import { verifyToken } from '../middleware/verify-token';

const router = express.Router();

router.post('/', verifyToken, submitEmail);

router.post('/multiple', verifyToken, submitMultipleEmails);

export default router;
