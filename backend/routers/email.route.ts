import express from 'express';
import multer from 'multer';
import { submitMultipleEmails } from '../controllers/email.controller';
import { verifyToken } from '../middleware/verify-token';
import { multipleEmailsBodySchema } from '../schema/email.schema';
import { validateRequestBody } from '../middleware/validation';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB per file (Gmail limit)
});

const parseMultipartBody: express.RequestHandler = (req, _res, next) => {
  try {
    if (typeof req.body.recipients === 'string') {
      req.body.recipients = JSON.parse(req.body.recipients);
    }
  } catch {
    // let validation middleware handle invalid JSON
  }
  next();
};

router.post('/multiple',
  verifyToken,
  upload.array('attachments', 10),
  parseMultipartBody,
  validateRequestBody(multipleEmailsBodySchema),
  submitMultipleEmails
);

export default router;
