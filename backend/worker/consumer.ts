import Campaign, { EmailJob } from '../models/campaign.model';
import { createConsumeChannel, getQueueName, publishEmailJob } from '../services/rabbitmq.service';
import { sendEmail } from '../services/email.service';
import { readFile } from '../services/file-storage.service';
import Signature from '../models/signature.model';
import User from '../models/user.model';
import logger from '../utils/wiston-log';
import { Recipient } from '../schema/common.schema';

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
      value || `Missing field ${field}`
    );
  });
  return result;
};

const updateJobStatus = async (
  campaignId: string,
  jobId: string,
  update: Partial<EmailJob>
) => {
  const setFields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(update)) {
    setFields[`email_jobs.${jobId}.${key}`] = value;
  }
  setFields[`email_jobs.${jobId}.updatedAt`] = new Date();
  await Campaign.findByIdAndUpdate(campaignId, { $set: setFields });
};

const checkAndFinalizeCampaign = async (campaignId: string) => {
  const campaign = await Campaign.findById(campaignId);
  if (!campaign) return;

  const jobs = Object.values(campaign.email_jobs as Record<string, EmailJob>);
  const allDone = jobs.every(
    (j) => j.status === 'sent' || j.status === 'failed' || j.status === 'cancelled'
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
        await updateJobStatus(campaignId, jobId, { status: 'failed', error: 'Missing recipient email' });
        channel.ack(msg);
        await checkAndFinalizeCampaign(campaignId);
        return;
      }

      const user = await User.findById(campaign.user_id);
      if (!user) throw new Error(`User not found for campaign ${campaignId}`);

      const activeAccount = user.activeAccountId
        ? (user.connectedAccounts || []).find(
            (acc: any) => acc._id.toString() === String(user.activeAccountId)
          )
        : null;
      const senderEmail = activeAccount?.email || user.email;

      const matchedSignature =
        await Signature.findOne({ userId: campaign.user_id, sourceEmail: senderEmail }).lean() ??
        await Signature.findOne({ userId: campaign.user_id, isDefault: true }).lean();
      const signature = matchedSignature?.content || '';

      const personalizedContent = processContent(campaign.content, job.recipientData as Recipient);

      let emailAttachments;
      if (campaign.attachments && campaign.attachments.length > 0) {
        emailAttachments = campaign.attachments.map((att) => ({
          filename: att.filename,
          mimeType: att.mimeType,
          content: readFile(campaignId, att.storedName),
        }));
      }

      await sendEmail({
        content: personalizedContent,
        receivers: [job.recipientData['Email']],
        user,
        subject: campaign.subject,
        signature,
        attachments: emailAttachments,
      });

      await updateJobStatus(campaignId, jobId, { status: 'sent', sentAt: new Date() });
      logger.info(`Job ${jobId} sent successfully`);

    } catch (err: any) {
      logger.error(`Job ${jobId} failed`, { error: err.message });

      if (retryCount < maxRetries) {
        const delayMs = 5 * 60 * 1000 * (retryCount + 1);
        await updateJobStatus(campaignId, jobId, {
          retryCount: retryCount + 1,
          error: err.message,
        });
        publishEmailJob(campaignId, jobId, delayMs);
        logger.info(`Job ${jobId} queued for retry ${retryCount + 1}/${maxRetries}`);
      } else {
        await updateJobStatus(campaignId, jobId, {
          status: 'failed',
          error: err.message,
        });
        logger.error(`Job ${jobId} permanently failed after ${maxRetries} retries`);
      }
    }

    channel.ack(msg);
    await checkAndFinalizeCampaign(campaignId);
  });
};
