import Campaign, { EmailJob } from '../models/campaign.model';
import { createConsumeChannel, getQueueName, publishEmailJob } from '../services/rabbitmq.service';
import { sendEmail } from '../services/email.service';
import { readCampaignConfig, readFile } from '../services/file-storage.service';
import User, { ConnectedAccount } from '../models/user.model';
import logger from '../utils/wiston-log';
import { Recipient } from '../schema/common.schema';
import { setupGmailWatch } from '../services/gmail-watch.service';
import {
  markEmailJobFailed,
  markEmailJobSent,
  updateEmailJob,
} from '../repositories/campaign.repository';

type QueueMessage = {
  campaignId: string;
  jobId: string;
};

const processContent = (content: string, recipient: Recipient): string => {
  const fields = Object.keys(recipient);
  let result = content;
  fields.forEach((field) => {
    const value = recipient[field] || '';
    result = result.replace(new RegExp(`\\[${field}\\]`, 'g'), value || `Missing field ${field}`);
    result = result.replace(
      new RegExp(`\\{\\{${field}\\s*\\|\\|\\s*['"]([^'"]+)['"]\\}\\}`, 'g'),
      value || `Missing field ${field}`,
    );
  });
  return result;
};

const checkAndFinalizeCampaign = async (campaignId: string) => {
  const campaign = await Campaign.findById(campaignId);
  if (!campaign) return;

  const jobs = Object.values(campaign.email_jobs as Record<string, EmailJob>);
  const allDone = jobs.every(
    (j) => j.status === 'sent' || j.status === 'failed' || j.status === 'cancelled',
  );

  if (!allDone) return;

  const hasSent = jobs.some((j) => j.status === 'sent');
  const newStatus = hasSent ? 'completed' : 'failed';
  await Campaign.findByIdAndUpdate(campaignId, { status: newStatus });
  logger.info(`Campaign ${campaignId} finalized with status: ${newStatus}`);
};

export const startConsumer = async (maxRetries: number): Promise<void> => {
  const channel = await createConsumeChannel();
  const queue = getQueueName();

  channel.consume(queue, async (msg) => {
    if (!msg) return;

    const parsed = JSON.parse(msg.content.toString());
    if (!parsed.campaignId || !parsed.jobId) {
      logger.warn('Invalid message format, skipping', { parsed });
      channel.ack(msg);
      return;
    }
    const { campaignId, jobId } = parsed as QueueMessage;
    logger.info(`Processing job ${jobId} for campaign ${campaignId}`);

    let retryCount = 0;
    try {
      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        logger.warn(`Campaign ${campaignId} not found, skipping job ${jobId}`);
        channel.ack(msg);
        return;
      }

      const jobs = campaign.email_jobs as Record<string, EmailJob>;
      const job = jobs[jobId];
      retryCount = job?.retryCount ?? 0;

      if (!job || job.status === 'cancelled') {
        logger.info(`Job ${jobId} is cancelled or missing, skipping`);
        channel.ack(msg);
        return;
      }

      if (!job.recipientData?.['Email']) {
        logger.error(`Job ${jobId} missing recipient email, marking as failed`);
        await markEmailJobFailed(campaignId, jobId, {
          status: 'failed',
          error: 'Missing recipient email',
        });
        channel.ack(msg);
        await checkAndFinalizeCampaign(campaignId);
        return;
      }

      const user = await User.findById(campaign.user_id);
      if (!user) throw new Error(`User not found for campaign ${campaignId}`);

      const config = await readCampaignConfig(campaignId);
      const signature = config?.signature ?? '';

      const personalizedContent = processContent(campaign.content, job.recipientData as Recipient);

      let emailAttachments;
      if (campaign.attachments && campaign.attachments.length > 0) {
        emailAttachments = await Promise.all(campaign.attachments.map(async (att) => ({
          filename: att.filename,
          mimeType: att.mimeType,
          content: await readFile(campaignId, att.storedName),
        })));
      }

      const sendResult = await sendEmail({
        content: personalizedContent,
        receivers: [job.recipientData['Email']],
        user,
        subject: campaign.subject,
        signature,
        attachments: emailAttachments,
      });

      await markEmailJobSent(campaignId, jobId, {
        status: 'sent',
        sentAt: new Date(),
        threadId: sendResult.threadId ?? null,
        messageId: sendResult.messageId ?? null,
      });
      logger.info(`Job ${jobId} sent successfully`);

      // Setup Gmail watch if account doesn't have an active one.
      // Bookkeeping sau khi gửi phải được cô lập: email đã gửi thành công và đã được
      // tính vào sentCount, nên lỗi ở đây (refresh token hết hạn, Gmail 5xx, DB lỗi
      // tạm thời) không được rơi xuống handler xử lý job thất bại và ghi đè
      // status 'sent' thành 'failed'.
      try {
        const freshUser = await User.findById(user._id);
        if (freshUser) {
          const activeAcc = freshUser.connectedAccounts.find(
            (a: ConnectedAccount) =>
              a._id.toString() === freshUser.activeAccountId?.toString() && a.provider === 'gmail',
          );
          if (
            activeAcc &&
            (!activeAcc.gmailWatchExpiry || activeAcc.gmailWatchExpiry < new Date())
          ) {
            await setupGmailWatch(
              freshUser._id.toString(),
              activeAcc._id.toString(),
              activeAcc.accessToken,
              activeAcc.refreshToken,
            );
          }
        }
      } catch (watchErr: unknown) {
        const watchErrorMessage =
          watchErr instanceof Error ? watchErr.message : String(watchErr);
        logger.warn('Post-send Gmail watch setup failed, job remains sent', {
          campaignId,
          jobId,
          error: watchErrorMessage,
        });
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error(`Job ${jobId} failed`, { error: errorMessage });

      if (retryCount < maxRetries) {
        const delayMs = 5 * 60 * 1000 * (retryCount + 1);
        await updateEmailJob(campaignId, jobId, {
          retryCount: retryCount + 1,
          error: errorMessage,
        });
        publishEmailJob(campaignId, jobId, delayMs);
        logger.info(`Job ${jobId} queued for retry ${retryCount + 1}/${maxRetries}`);
      } else {
        await markEmailJobFailed(campaignId, jobId, {
          status: 'failed',
          error: errorMessage,
        });
        logger.error(`Job ${jobId} permanently failed after ${maxRetries} retries`);
      }
    }

    channel.ack(msg);
    await checkAndFinalizeCampaign(campaignId);
  });
};
