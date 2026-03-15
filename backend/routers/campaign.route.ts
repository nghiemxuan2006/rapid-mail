import express from 'express';
import { verifyToken } from '../middleware/verify-token';
import { validateRequestBody, validateRequestParams } from '../middleware/validation';
import {
  createCampaignBodySchema,
  updateCampaignBodySchema,
  campaignParamsSchema,
} from '../schema/campaign.schema';
import {
  createCampaign,
  deleteCampaignById,
  getAllCampaigns,
  getCampaignById,
  updateCampaign,
} from '../controllers/campaign.controller';

const router = express.Router();

router.post('/',
  verifyToken,
  validateRequestBody(createCampaignBodySchema),
  createCampaign
);

router.get('/', verifyToken, getAllCampaigns);

router.get('/:id',
  verifyToken,
  validateRequestParams(campaignParamsSchema),
  getCampaignById
);

router.put('/:id',
  verifyToken,
  validateRequestParams(campaignParamsSchema),
  validateRequestBody(updateCampaignBodySchema),
  updateCampaign
);

router.delete('/:id',
  verifyToken,
  validateRequestParams(campaignParamsSchema),
  deleteCampaignById
);

export default router;
