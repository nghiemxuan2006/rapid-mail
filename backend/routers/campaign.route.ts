import express from 'express';
import { verifyToken } from '../middleware/verify-token';
import { MutipleEmailsPostRequestSchema } from '../schema/email.schema';
import { validateRequestBody } from '../middleware/validation';
import { createCampaign, deleteCampaignById, getAllCampaigns, getCampaignById, updateCampaign } from '../controllers/campaign.controller';

const router = express.Router();



router.post('/', verifyToken, createCampaign);
router.get('/', verifyToken, getAllCampaigns);
router.get('/:id', verifyToken, getCampaignById);
router.delete('/:id', verifyToken, deleteCampaignById);
router.put('/:id', verifyToken, updateCampaign);

export default router;
