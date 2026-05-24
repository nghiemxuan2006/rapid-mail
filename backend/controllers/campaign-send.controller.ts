import { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Campaign, { EmailJob } from '../models/campaign.model';
import { publishEmailJob } from '../services/rabbitmq.service';
import { SendCampaignBody, CampaignSendParams } from '../schema/send.schema';
import { BAD_REQUEST_ERROR, NOT_FOUND_ERROR, UNAUTHORIZED_ERROR } from '../utils/error';
import User from '../models/user.model';
import Signature from '../models/signature.model';
import { writeCampaignConfig } from '../services/file-storage.service';

export const sendCampaign = async (
  req: Request<CampaignSendParams, {}, SendCampaignBody>,
  res: Response,
  next: NextFunction
) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) throw new NOT_FOUND_ERROR('Campaign not found');
    if (campaign.user_id.toString() !== req.user.sub) {
      throw new UNAUTHORIZED_ERROR('No permission');
    }
    if (campaign.status !== 'draft') {
      throw new BAD_REQUEST_ERROR('Campaign has already been sent or is currently sending');
    }
    if (!campaign.recipients || campaign.recipients.length === 0) {
      throw new BAD_REQUEST_ERROR('Campaign has no recipients');
    }

    const { sendMode } = req.body;
    const now = new Date();
    const emailJobs: Record<string, EmailJob> = {};
    const jobPublishQueue: Array<{ jobId: string; delayMs: number }> = [];

    for (const recipient of campaign.recipients) {
      const jobId = uuidv4();
      let scheduledAt: Date;

      if (sendMode === 'now') {
        scheduledAt = now;
      } else if (sendMode === 'schedule_all') {
        scheduledAt = new Date((req.body as { sendMode: 'schedule_all'; scheduledAt: string }).scheduledAt);
      } else {
        // schedule_individual
        const times = (req.body as { sendMode: 'schedule_individual'; scheduledTimes: Record<string, string> }).scheduledTimes;
        const recipientId = recipient['id'] as string;
        if (!times[recipientId]) {
          throw new BAD_REQUEST_ERROR(`Missing scheduledAt for recipient ${recipientId}`);
        }
        scheduledAt = new Date(times[recipientId]);
      }

      emailJobs[jobId] = {
        recipientData: recipient as Record<string, string>,
        status: 'pending',
        scheduledAt,
        sentAt: null,
        error: null,
        retryCount: 0,
        createdAt: now,
        updatedAt: now,
      };

      const delayMs = Math.max(0, scheduledAt.getTime() - now.getTime());
      jobPublishQueue.push({ jobId, delayMs });
    }

    const user = await User.findById(campaign.user_id);
    if (!user) throw new NOT_FOUND_ERROR('User not found');

    const activeAccount = user.activeAccountId
      ? (user.connectedAccounts || []).find(
          (acc: any) => acc._id.toString() === String(user.activeAccountId)
        )
      : null;
    const senderEmail = activeAccount?.email || user.email;

    const matchedSignature = await Signature.findOne({
      userId: campaign.user_id,
      sourceEmail: senderEmail,
    }).lean();
    const snapshotSignature = matchedSignature?.content ?? '';

    writeCampaignConfig(campaign._id.toString(), { signature: snapshotSignature });

    for (const { jobId, delayMs } of jobPublishQueue) {
      publishEmailJob(campaign._id.toString(), jobId, delayMs);
    }

    campaign.email_jobs = emailJobs;
    campaign.status = 'sending';
    campaign.sendMode = sendMode;
    campaign.markModified('email_jobs');
    await campaign.save();

    res.json({ message: 'queued', jobCount: Object.keys(emailJobs).length });
  } catch (error) {
    next(error);
  }
};

export const cancelCampaign = async (
  req: Request<CampaignSendParams>,
  res: Response,
  next: NextFunction
) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) throw new NOT_FOUND_ERROR('Campaign not found');
    if (campaign.user_id.toString() !== req.user.sub) {
      throw new UNAUTHORIZED_ERROR('No permission');
    }
    if (campaign.status !== 'sending') {
      throw new BAD_REQUEST_ERROR('Only sending campaigns can be cancelled');
    }

    const jobs = campaign.email_jobs as Record<string, EmailJob>;
    let cancelledCount = 0;

    for (const jobId of Object.keys(jobs)) {
      if (jobs[jobId].status === 'pending') {
        jobs[jobId].status = 'cancelled';
        jobs[jobId].updatedAt = new Date();
        cancelledCount++;
      }
    }

    campaign.email_jobs = jobs;
    campaign.markModified('email_jobs');
    await campaign.save();

    res.json({ message: 'cancelled', cancelledCount });
  } catch (error) {
    next(error);
  }
};

export const getCampaignStatus = async (
  req: Request<CampaignSendParams>,
  res: Response,
  next: NextFunction
) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) throw new NOT_FOUND_ERROR('Campaign not found');
    if (campaign.user_id.toString() !== req.user.sub) {
      throw new UNAUTHORIZED_ERROR('No permission');
    }

    const jobs = campaign.email_jobs as Record<string, EmailJob>;
    const jobValues = Object.values(jobs);

    const summary = {
      total: jobValues.length,
      sent: jobValues.filter((j) => j.status === 'sent').length,
      failed: jobValues.filter((j) => j.status === 'failed').length,
      pending: jobValues.filter((j) => j.status === 'pending').length,
      cancelled: jobValues.filter((j) => j.status === 'cancelled').length,
    };

    res.json({
      status: campaign.status,
      sendMode: campaign.sendMode,
      summary,
      jobs,
    });
  } catch (error) {
    next(error);
  }
};
