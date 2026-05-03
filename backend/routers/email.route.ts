import express from 'express';
import { submitCampaignEmails } from '../controllers/email.controller';
import { verifyToken } from '../middleware/verify-token';
import { sendCampaignEmailsSchema } from '../schema/email.schema';
import { validateRequestBody } from '../middleware/validation';

const router = express.Router();

router.post('/multiple',
  verifyToken,
  validateRequestBody(sendCampaignEmailsSchema),
  submitCampaignEmails
);

export default router;
