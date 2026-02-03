import express from 'express';
import { submitEmail, submitMultipleEmails } from '../controllers/email.controller';
import { verifyToken } from '../middleware/verify-token';
import { MutipleEmailsPostRequestSchema } from '../schema/email.schema';
import { validateRequestBody } from '../middleware/validation';

const router = express.Router();

router.post('/multiple',
    validateRequestBody(MutipleEmailsPostRequestSchema),
    verifyToken,
    submitMultipleEmails
);

export default router;
