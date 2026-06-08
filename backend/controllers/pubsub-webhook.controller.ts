import { Request, Response } from 'express';
import User from '../models/user.model';
import Campaign, { EmailJob } from '../models/campaign.model';
import Reply from '../models/reply.model';
import logger from '../utils/wiston-log';

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
  startHistoryId: string
): Promise<{ messages: HistoryMessage[]; newHistoryId: string | null }> => {
  const url = `${GMAIL_HISTORY_ENDPOINT}?startHistoryId=${startHistoryId}&historyTypes=messageAdded&labelId=INBOX`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) return { messages: [], newHistoryId: null };

  const data = await response.json() as {
    history?: HistoryRecord[];
    historyId?: string;
  };

  const messages: HistoryMessage[] = (data.history ?? []).flatMap(
    (h) => (h.messagesAdded ?? []).map((m) => m.message)
  );

  return { messages, newHistoryId: data.historyId ?? null };
};

const fetchMessageSnippet = async (
  accessToken: string,
  messageId: string
): Promise<{ snippet: string; gmailUrl: string }> => {
  const response = await fetch(
    `${GMAIL_MESSAGE_ENDPOINT}/${messageId}?format=metadata&metadataHeaders=Message-ID`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!response.ok) return { snippet: '', gmailUrl: '' };
  const data = await response.json() as {
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
  res.status(200).send('ok');

  try {
    const message = req.body?.message;
    if (!message?.data) return;

    const decoded = JSON.parse(Buffer.from(message.data, 'base64').toString('utf-8')) as {
      emailAddress?: string;
      historyId?: string;
    };

    const { emailAddress, historyId: newHistoryId } = decoded;
    if (!emailAddress || !newHistoryId) return;

    const user = await User.findOne({
      connectedAccounts: {
        $elemMatch: { provider: 'gmail', email: emailAddress },
      },
    });
    if (!user) return;

    const account = user.connectedAccounts.find(
      (a) => a.provider === 'gmail' && a.email === emailAddress
    );
    if (!account?.gmailHistoryId) return;

    const { messages, newHistoryId: latestHistoryId } = await fetchHistory(
      account.accessToken,
      account.gmailHistoryId
    );

    if (latestHistoryId) {
      await User.findOneAndUpdate(
        { _id: user._id, 'connectedAccounts._id': account._id },
        { $set: { 'connectedAccounts.$.gmailHistoryId': latestHistoryId } }
      );
    }

    if (messages.length === 0) return;

    const threadIds = messages.map((m) => m.threadId);
    const campaigns = await Campaign.find({ user_id: user._id });

    type ThreadMatch = { campaignId: string; jobId: string; recipientEmail: string };
    const threadMap = new Map<string, ThreadMatch>();

    for (const campaign of campaigns) {
      const jobs = campaign.email_jobs as Record<string, EmailJob>;
      for (const [jobId, job] of Object.entries(jobs)) {
        if (job.threadId && threadIds.includes(job.threadId)) {
          threadMap.set(job.threadId, {
            campaignId: campaign._id.toString(),
            jobId,
            recipientEmail: job.recipientData['Email'] ?? '',
          });
        }
      }
    }

    for (const msg of messages) {
      const match = threadMap.get(msg.threadId);
      if (!match) continue;

      const exists = await Reply.findOne({ replyMessageId: msg.id });
      if (exists) continue;

      const { snippet, gmailUrl } = await fetchMessageSnippet(account.accessToken, msg.id);

      await Reply.create({
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

      logger.info('Reply saved', { replyMessageId: msg.id, recipientEmail: match.recipientEmail });
    }
  } catch (err: any) {
    logger.error('Error processing Pub/Sub webhook', { error: err.message });
  }
};
