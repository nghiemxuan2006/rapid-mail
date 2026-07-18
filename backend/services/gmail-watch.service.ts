import User from '../models/user.model';
import settings from '../config/env';
import logger from '../utils/wiston-log';
import { refreshGoogleAccessToken } from './email.service';
import { updateUserConnectedAccountToken } from '../repositories/user.repository';

const GMAIL_WATCH_ENDPOINT = 'https://gmail.googleapis.com/gmail/v1/users/me/watch';

const callGmailWatch = (accessToken: string): Promise<Response> =>
  fetch(GMAIL_WATCH_ENDPOINT, {
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

export const setupGmailWatch = async (
  userId: string,
  accountId: string,
  accessToken: string,
  refreshToken?: string,
): Promise<void> => {
  let response = await callGmailWatch(accessToken);

  if (response.status === 401 && refreshToken) {
    try {
      accessToken = await refreshGoogleAccessToken(refreshToken);
      await updateUserConnectedAccountToken(userId, accountId, accessToken);
      response = await callGmailWatch(accessToken);
    } catch (refreshErr) {
      logger.error('Failed to refresh access token for Gmail watch', {
        userId,
        accountId,
        refreshErr,
      });
      return;
    }
  }

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

      await setupGmailWatch(
        user._id.toString(),
        account._id.toString(),
        account.accessToken,
        account.refreshToken,
      );
    }
  }
};
