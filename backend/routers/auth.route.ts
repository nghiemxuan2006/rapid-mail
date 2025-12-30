import express from 'express';
import { login } from '../controllers/auth.controller';
import { verifyToken } from '../middleware/verify-token';

const router = express.Router();


router.get('/login', login);

export default router;