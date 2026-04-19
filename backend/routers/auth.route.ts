import express from 'express';
import { getProfile, login, refresh } from '../controllers/auth.controller';
import { validateRequestQuery } from '../middleware/validation';
import { loginQuerySchema } from '../schema/auth.schema';
import verifyToken from '../middleware/verify-token';

const router = express.Router();

router.get('/login', validateRequestQuery(loginQuerySchema), login);
router.post('/refresh-token', refresh);
router.get('/profile', verifyToken, getProfile);

export default router;
