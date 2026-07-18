import express from 'express';
import {
  importGmailSignaturesByAccountHandler,
  getSignaturesHandler,
  getDefaultSignatureHandler,
  createSignatureHandler,
  updateSignatureHandler,
  deleteSignatureHandler,
} from '../controllers/signature.controller';
import { verifyToken } from '../middleware/verify-token';
import { validateRequestBody } from '../middleware/validation';
import { createSignatureBodySchema, updateMySignatureBodySchema } from '../schema/signature.schema';

const router = express.Router();

// Import from provider APIs
router.get('/import/gmail/:accountId', verifyToken, importGmailSignaturesByAccountHandler);

// App-managed signatures
router.get('/default', verifyToken, getDefaultSignatureHandler);
router.get('/', verifyToken, getSignaturesHandler);
router.post(
  '/',
  verifyToken,
  validateRequestBody(createSignatureBodySchema),
  createSignatureHandler,
);
router.put(
  '/:id',
  verifyToken,
  validateRequestBody(updateMySignatureBodySchema),
  updateSignatureHandler,
);
router.delete('/:id', verifyToken, deleteSignatureHandler);

export default router;
