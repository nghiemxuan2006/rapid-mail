import User from '../models/user.model';
import settings from '../config/env';
import logger from '../utils/wiston-log';

const GMAIL_WATCH_ENDPOINT = 'https://gmail.googleapis.com/gmail/v1/users/me/watch';

export const setupGmailWatch = async (
  userId: string,
  accountId: string,
  accessToken: string,
): Promise<void> => {
  const response = await fetch(GMAIL_WATCH_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      topicName: settings.GOOGLE_PUBSUB_TOPIC,
      labelIds: ['INBOX'],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    logger.error('Failed to setup Gmail watch', { userId, accountId, err });
    return;
  }

  const data = (await response.json()) as { historyId: string; expiration: string };

  await User.findOneAndUpdate(
    { _id: userId, 'connectedAccounts._id': accountId },
    {
      $set: {
        'connectedAccounts.$.gmailHistoryId': data.historyId,
        'connectedAccounts.$.gmailWatchExpiry': new Date(Number(data.expiration)),
      },
    },
  );

  logger.info('Gmail watch setup', { userId, accountId, historyId: data.historyId });
};

export const renewExpiringWatches = async (): Promise<void> => {
  const threshold = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const users = await User.find({
    connectedAccounts: {
      $elemMatch: {
        provider: 'gmail',
        gmailWatchExpiry: { $lt: threshold },
      },
    },
  });

  for (const user of users) {
    for (const account of user.connectedAccounts) {
      if (
        account.provider !== 'gmail' ||
        !account.gmailWatchExpiry ||
        account.gmailWatchExpiry > threshold
      )
        continue;

      await setupGmailWatch(user._id.toString(), account._id.toString(), account.accessToken);
    }
  }
};
