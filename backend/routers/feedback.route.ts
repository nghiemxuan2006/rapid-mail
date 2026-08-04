import express from 'express';
import { verifyToken } from '../middleware/verify-token';
import { validateRequestBody } from '../middleware/validation';
import { createFeedbackBodySchema } from '../schema/feedback.schema';
import { submitFeedback, getMyFeedback } from '../controllers/feedback.controller';

const router = express.Router();

router.post('/', verifyToken, validateRequestBody(createFeedbackBodySchema), submitFeedback);
router.get('/mine', verifyToken, getMyFeedback);

export default router;
