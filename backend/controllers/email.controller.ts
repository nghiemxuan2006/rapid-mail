import { Request, Response, NextFunction } from 'express';
import { sendCampaignEmails } from '../services/email.service';
import { UNAUTHORIZED_ERROR } from '../utils/error';
import { SendCampaignEmailsBody } from '../schema/email.schema';

export const submitCampaignEmails = async (
  req: Request<{}, {}, SendCampaignEmailsBody>,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.sub as string | undefined;
    if (!userId) {
      throw new UNAUTHORIZED_ERROR('Missing user context');
    }

    const { campaignId } = req.body;
    await sendCampaignEmails({ campaignId, userId });

    res.json({
      message: 'All emails accepted',
    });
  } catch (error) {
    next(error);
  }
};
