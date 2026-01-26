import express from 'express';
import { getSignatures } from '../controllers/signature.controller';
import { verifyToken } from '../middleware/verify-token';

const router = express.Router();

router.get('/', verifyToken, getSignatures);

export default router;
