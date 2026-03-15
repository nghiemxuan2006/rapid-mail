import express from 'express';
import { getSignatures, updateSignature } from '../controllers/signature.controller';
import { verifyToken } from '../middleware/verify-token';
import { validateRequestBody } from '../middleware/validation';
import { updateSignatureBodySchema } from '../schema/signature.schema';

const router = express.Router();

router.get('/', verifyToken, getSignatures);
router.put('/', verifyToken, validateRequestBody(updateSignatureBodySchema), updateSignature);

export default router;
