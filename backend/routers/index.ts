import express from 'express';

import authRoutes from './auth.route';
import campaignRoutes from './campaign.route';
import signatureRoutes from './signature.route';
import replyRoutes from './reply.router';
import pubsubRoutes from './pubsub.router';
import feedbackRoutes from './feedback.route';
import adminRoutes from './admin.route';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/signatures', signatureRoutes);
router.use('/replies', replyRoutes);
router.use('/webhooks', pubsubRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/admin', adminRoutes);

export default router;
