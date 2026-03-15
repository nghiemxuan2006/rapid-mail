import express from 'express';
import { submitMultipleEmails } from '../controllers/email.controller';
import { verifyToken } from '../middleware/verify-token';
import { multipleEmailsBodySchema } from '../schema/email.schema';
import { validateRequestBody } from '../middleware/validation';

const router = express.Router();

router.post('/multiple',
  verifyToken,
  validateRequestBody(multipleEmailsBodySchema),
  submitMultipleEmails
);

export default router;
