import express from 'express';
import { getSignatures, updateSignature } from '../controllers/signature.controller';
import { verifyToken } from '../middleware/verify-token';
import { validateRequestBody } from '../middleware/validation';
import { updateSignatureSchema } from '../schema/signature.schema';

const router = express.Router();

router.get('/', verifyToken, getSignatures);
router.put('/', verifyToken, validateRequestBody(updateSignatureSchema), updateSignature);

export default router;
