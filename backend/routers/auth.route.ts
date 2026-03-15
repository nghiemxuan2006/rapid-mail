import express from 'express';
import { login, refresh } from '../controllers/auth.controller';
import { validateRequestQuery } from '../middleware/validation';
import { loginQuerySchema } from '../schema/auth.schema';

const router = express.Router();

router.get('/login', validateRequestQuery(loginQuerySchema), login);
router.post('/refresh-token', refresh);

export default router;
