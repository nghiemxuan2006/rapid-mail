import { BAD_REQUEST_ERROR, UNAUTHORIZED_ERROR } from '../utils/error';
import logger from '../utils/wiston-log';
import settings from '../config/env';
import User from '../models/user.model';
import { Recipient, MutipleEmailsPostRequestType } from '../schema/email.schema';
import { getSignatureList } from './signature.service';

export type EmailBody = {
    content: string;
    receivers: string[];
    subject: string;
    signature?: string;
};

export type EmailPayload = EmailBody & {
    userId: string;
};

const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GMAIL_SEND_ENDPOINT = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';

const isValidReceiver = (receiver: string) => {
    return typeof receiver === 'string' && receiver.trim().toLowerCase().endsWith('@gmail.com');
};

const base64UrlEncode = (input: string) => {
    return Buffer.from(input)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
};

const buildRawMessage = (from: string, to: string[], subject: string, content: string) => {
    const headers = [
        `From: ${from}`,
        `To: ${to.join(', ')}`,
        `Subject: ${subject}`,
        'Content-Type: text/html; charset="UTF-8"'
    ];

    const message = `${headers.join('\r\n')}\r\n\r\n${content}`;
    return base64UrlEncode(message);
};

const ensureGoogleConfig = () => {
    if (!settings.GOOGLE_CLIENT_ID || !settings.GOOGLE_CLIENT_SECRET) {
        throw new BAD_REQUEST_ERROR('Google OAuth configuration is missing');
    }
};

const refreshGoogleAccessToken = async (refreshToken: string): Promise<string> => {
    ensureGoogleConfig();

    const payload = new URLSearchParams({
        client_id: settings.GOOGLE_CLIENT_ID,
        client_secret: settings.GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
    });

    const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: payload
    });

    const data = await response.json() as { access_token?: string; expires_in?: number; error_description?: string };

    if (!response.ok || !data.access_token) {
        throw new UNAUTHORIZED_ERROR(data.error_description || 'Unable to refresh Google access token');
    }

    return data.access_token;
};

const sendWithGmailApi = async (accessToken: string, rawMessage: string) => {
    const response = await fetch(GMAIL_SEND_ENDPOINT, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw: rawMessage })
    });

    if (response.status === 401) {
        return { needRefresh: true, messageId: null } as const;
    }

    const data = await response.json() as { id?: string; error?: { message?: string } };

    if (!response.ok || !data.id) {
        throw new BAD_REQUEST_ERROR(data.error?.message || 'Failed to send email with Gmail API');
    }

    return { needRefresh: false, messageId: data.id } as const;
};

export const sendEmail = async ({ content, receivers, userId, subject, signature }: EmailPayload) => {
    if (!content || typeof content !== 'string' || !content.trim()) {
        throw new BAD_REQUEST_ERROR('content is required');
    }

    if (!Array.isArray(receivers) || receivers.length === 0) {
        throw new BAD_REQUEST_ERROR('receivers must be a non-empty array');
    }

    const invalidReceivers = receivers.filter((receiver) => !isValidReceiver(receiver));

    if (invalidReceivers.length > 0) {
        throw new BAD_REQUEST_ERROR('receivers must be valid @gmmail.com addresses');
    }

    const uniqueReceivers = Array.from(new Set(receivers.map((receiver) => receiver.trim().toLowerCase())));

    const user = await User.findById(userId);
    if (!user) {
        throw new UNAUTHORIZED_ERROR('User not found');
    }

    const rawMessage = buildRawMessage(user.email, uniqueReceivers, subject, content.trim() + '\n\n' + (signature || ''));

    let accessToken = user.googleAccessToken;
    let sendResult = await sendWithGmailApi(accessToken, rawMessage);

    if (sendResult.needRefresh) {
        accessToken = await refreshGoogleAccessToken(user.googleRefreshToken);
        await User.findByIdAndUpdate(userId, { googleAccessToken: accessToken });
        sendResult = await sendWithGmailApi(accessToken, rawMessage);
    }

    if (sendResult.needRefresh) {
        throw new UNAUTHORIZED_ERROR('Unable to send email after refreshing token');
    }

    logger.info('Email sent via Gmail API', { receiverCount: uniqueReceivers.length, messageId: sendResult.messageId });

    return {
        content: content.trim(),
        receivers: uniqueReceivers,
        status: 'sent',
        messageId: sendResult.messageId
    };
};

type CustomEmailPayload = MutipleEmailsPostRequestType & {
    userId: string;
}

const processContent = (content: string, recipient: Recipient, fields: string[]): string => {
    let preview = structuredClone(content);
    fields.forEach((field) => {
        const value = recipient[field] || '';
        // Replace [FieldName]
        preview = preview.replace(
            new RegExp(`\\[${field}\\]`, 'g'),
            value ? value : `Missing field ${field}`
        );

        preview = preview.replace(
            new RegExp(`\\{\\{${field}\\s*\\|\\|\\s*['"]([^'"]+)['"]\\}\\}`, 'g'),
            value ? value : `Missing field ${field}`
        );
    })

    return preview;
}
export const sendMultipleEmails = async ({ content, recipients, userId, subject }: CustomEmailPayload) => {
    if (!content || typeof content !== 'string' || !content.trim()) {
        throw new BAD_REQUEST_ERROR('content is required');
    }

    if (!Array.isArray(recipients) || recipients.length === 0) {
        throw new BAD_REQUEST_ERROR('recipients must be a non-empty array');
    }
    const res = await getSignatureList(userId, true);
    const signature = res?.signature || '';
    const fields = Object.keys(recipients[0]);
    recipients.forEach(async (recipient) => {
        const emailAddress = recipient['Email'];
        if (!isValidReceiver(emailAddress)) {
            throw new BAD_REQUEST_ERROR(`Invalid receiver email: ${emailAddress}`);
        }
        const personalizedContent = processContent(content, recipient, fields);
        await sendEmail({ content: personalizedContent, receivers: [emailAddress], userId, subject, signature })
    })

}
