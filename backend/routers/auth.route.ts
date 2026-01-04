import express from 'express';
import { login, refresh } from '../controllers/auth.controller';
import { validateRequestQuery } from '../middleware/validation';
import { loginSchema } from '../schema/login.schema';

const router = express.Router();

router.get('/login',validateRequestQuery(loginSchema), login);
router.post('/refresh-token', refresh);

export default router;