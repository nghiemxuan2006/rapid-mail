import express from 'express';
import multer from 'multer';
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
import { sendCampaignBodySchema, campaignSendParamsSchema } from '../schema/send.schema';
import { sendCampaign } from '../controllers/campaign-send.controller';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB per file
});

const parseMultipartBody: express.RequestHandler = (req, _res, next) => {
  try {
    if (typeof req.body.recipients === 'string') {
      req.body.recipients = JSON.parse(req.body.recipients);
    }
  } catch {
    // let validation middleware handle invalid JSON
  }
  next();
};

router.post('/',
  verifyToken,
  upload.array('attachments', 10),
  parseMultipartBody,
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
  upload.array('attachments', 10),
  parseMultipartBody,
  validateRequestBody(updateCampaignBodySchema),
  updateCampaign
);

router.delete('/:id',
  verifyToken,
  validateRequestParams(campaignParamsSchema),
  deleteCampaignById
);

router.post('/:id/send',
  verifyToken,
  validateRequestParams(campaignSendParamsSchema),
  validateRequestBody(sendCampaignBodySchema),
  sendCampaign
);

export default router;
