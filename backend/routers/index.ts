import express from 'express';

import authRoutes from './auth.route';
import emailRoutes from './email.route';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/email', emailRoutes);

export default router;