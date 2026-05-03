import express from 'express';

import authRoutes from './auth.route';
import emailRoutes from './email.route';
import campaignRoutes from './campaign.route';
import signatureRoutes from './signature.route';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/email', emailRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/signatures', signatureRoutes);

export default router;