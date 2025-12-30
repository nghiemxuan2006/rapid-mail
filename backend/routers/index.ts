import express from 'express';

import authRoutes from './auth.route';
import verifyToken from '../middleware/verify-token';

const router = express.Router();

router.use('/auth', authRoutes);

export default router;