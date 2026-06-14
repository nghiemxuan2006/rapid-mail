import { Request, Response } from 'express';
import { EmailJob } from '../models/campaign.model';
import { findCampaignsByUserIdFull } from '../repositories/campaign.repository';
import logger from '../utils/wiston-log';
import { findUserByConnectedAccountEmail, updateUserById } from '../repositories/user.repository';
import { findReplyByMessageId, createReply } from '../repositories/reply.repository';

const GMAIL_HISTORY_ENDPOINT = 'https://gmail.googleapis.com/gmail/v1/users/me/history';
const GMAIL_MESSAGE_ENDPOINT = 'https://gmail.googleapis.com/gmail/v1/users/me/messages';

type HistoryMessage = {
  id: string;
  threadId: string;
};

type HistoryRecord = {
  messagesAdded?: { message: HistoryMessage }[];
};

const fetchHistory = async (
  accessToken: string,
  startHistoryId: string,
): Promise<{ messages: HistoryMessage[]; newHistoryId: string | null }> => {
  const url = `${GMAIL_HISTORY_ENDPOINT}?startHistoryId=${startHistoryId}&historyTypes=messageAdded&labelId=INBOX`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    logger.warn('Gmail history fetch failed', { status: response.status, startHistoryId });
    return { messages: [], newHistoryId: null };
  }

  const data = (await response.json()) as {
    history?: HistoryRecord[];
    historyId?: string;
  };

  const messages: HistoryMessage[] = (data.history ?? []).flatMap((h) =>
    (h.messagesAdded ?? []).map((m) => m.message),
  );

  return { messages, newHistoryId: data.historyId ?? null };
};

const fetchMessageSnippet = async (
  accessToken: string,
  messageId: string,
): Promise<{ snippet: string; gmailUrl: string }> => {
  const response = await fetch(
    `${GMAIL_MESSAGE_ENDPOINT}/${messageId}?format=metadata&metadataHeaders=Message-ID`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok) {
    logger.warn('Gmail message fetch failed', { status: response.status, messageId });
    return { snippet: '', gmailUrl: '' };
  }
  const data = (await response.json()) as {
    snippet?: string;
    payload?: { headers?: { name: string; value: string }[] };
  };
  const snippet = (data.snippet ?? '').slice(0, 200);
  const rfc822MessageId = data.payload?.headers?.find((h) => h.name === 'Message-ID')?.value ?? '';
  const gmailUrl = rfc822MessageId
    ? `https://mail.google.com/mail/u/0/#search/rfc822msgid:${encodeURIComponent(rfc822MessageId)}`
    : '';
  return { snippet, gmailUrl };
};

export const handlePubSubWebhook = async (req: Request, res: Response): Promise<void> => {
  // Pub/Sub always expects 200 quickly, or it will retry
  res.status(200).json({ message: 'Webhook received', data: null });

  try {
    const message = req.body?.message;
    if (!message?.data) {
      logger.warn('Pub/Sub webhook: missing message.data');
      return;
    }

    const decoded = JSON.parse(Buffer.from(message.data, 'base64').toString('utf-8')) as {
      emailAddress?: string;
      historyId?: string;
    };

    const { emailAddress, historyId: newHistoryId } = decoded;
    logger.info('Pub/Sub webhook received', { emailAddress, historyId: newHistoryId });

    if (!emailAddress || !newHistoryId) {
      logger.warn('Pub/Sub webhook: missing emailAddress or historyId', { decoded });
      return;
    }

    const user = await findUserByConnectedAccountEmail(emailAddress);
    if (!user) {
      logger.warn('Pub/Sub webhook: no user found for email', { emailAddress });
      return;
    }

    const accountIndex = user.connectedAccounts.findIndex(
      (a) => a.provider === 'gmail' && a.email === emailAddress,
    );
    if (accountIndex === -1) {
      logger.warn('Pub/Sub webhook: gmail account not found in connectedAccounts', {
        userId: user._id,
        emailAddress,
      });
      return;
    }
    const account = user.connectedAccounts[accountIndex];
    if (!account?.gmailHistoryId) {
      logger.warn('Pub/Sub webhook: account has no gmailHistoryId', {
        userId: user._id,
        emailAddress,
      });
      return;
    }

    const { messages, newHistoryId: latestHistoryId } = await fetchHistory(
      account.accessToken,
      account.gmailHistoryId,
    );
    logger.info('Gmail history fetched', {
      userId: user._id,
      emailAddress,
      messageCount: messages.length,
      latestHistoryId,
    });

    if (latestHistoryId) {
      await updateUserById(user._id.toString(), {
        $set: { [`connectedAccounts.${accountIndex}.gmailHistoryId`]: latestHistoryId },
      });
      logger.info('gmailHistoryId updated', { userId: user._id, latestHistoryId });
    }

    if (messages.length === 0) {
      logger.info('Pub/Sub webhook: no new messages in history', { userId: user._id });
      return;
    }

    const threadIds = messages.map((m) => m.threadId);
    const campaigns = await findCampaignsByUserIdFull(user._id.toString());
    logger.info('Campaigns loaded for thread matching', {
      userId: user._id,
      campaignCount: campaigns.length,
      threadIds,
    });

    type ThreadMatch = { campaignId: string; jobId: string; recipientEmail: string };
    const threadMap = new Map<string, ThreadMatch>();

    for (const campaign of campaigns) {
      const jobs = (campaign.email_jobs ?? {}) as Record<string, EmailJob>;
      for (const [jobId, job] of Object.entries(jobs)) {
        if (job.threadId && threadIds.includes(job.threadId)) {
          threadMap.set(job.threadId, {
            campaignId: campaign._id.toString(),
            jobId,
            recipientEmail: job.recipientData['Email'] ?? '',
          });
          logger.info('Thread matched to campaign job', {
            threadId: job.threadId,
            campaignId: campaign._id,
            jobId,
            recipientEmail: job.recipientData['Email'],
          });
        }
      }
    }

    logger.info('Thread map built', { matchedThreads: threadMap.size, totalThreads: threadIds.length });

    for (const msg of messages) {
      const match = threadMap.get(msg.threadId);
      if (!match) {
        logger.info('No campaign match for thread', { messageId: msg.id, threadId: msg.threadId });
        continue;
      }

      const exists = await findReplyByMessageId(msg.id);
      if (exists) {
        logger.info('Reply already recorded, skipping', { messageId: msg.id });
        continue;
      }

      const { snippet, gmailUrl } = await fetchMessageSnippet(account.accessToken, msg.id);

      await createReply({
        campaignId: match.campaignId,
        jobId: match.jobId,
        recipientEmail: match.recipientEmail,
        threadId: msg.threadId,
        replyMessageId: msg.id,
        gmailUrl,
        snippet,
        receivedAt: new Date(),
        isRead: false,
        userId: user._id,
      });

      logger.info('Reply saved', {
        messageId: msg.id,
        threadId: msg.threadId,
        recipientEmail: match.recipientEmail,
        campaignId: match.campaignId,
      });
    }
  } catch (err: unknown) {
    logger.error('Error processing Pub/Sub webhook', err);
  }
};
