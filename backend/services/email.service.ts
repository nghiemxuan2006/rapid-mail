import { BAD_REQUEST_ERROR, UNAUTHORIZED_ERROR } from '../utils/error';
import logger from '../utils/wiston-log';
import settings from '../config/env';
import User, { UserDocument } from '../models/user.model';
import Campaign from '../models/campaign.model';
import Signature from '../models/signature.model';
import { Recipient } from '../schema/common.schema';
import { sendRequest } from '../utils/send-request';
import { readFile } from './file-storage.service';
import { cleanSignatureHtml } from '../utils/clean-signature-html';

type InlineImage = {
    contentId: string;
    mimeType: string;
    contentBytes: string; // base64
};

function extractInlineImages(html: string): { html: string; images: InlineImage[] } {
    const images: InlineImage[] = [];
    let idx = 0;
    const result = html.replace(/src="data:([^;]+);base64,([^"]+)"/g, (_match, mimeType, b64) => {
        const contentId = `inline-img-${idx++}@rapidmail`;
        images.push({ contentId, mimeType, contentBytes: b64 });
        return `src="cid:${contentId}"`;
    });
    return { html: result, images };
}

export type Attachment = {
    filename: string;
    mimeType: string;
    content: Buffer;
};

export type EmailBody = {
    content: string;
    receivers: string[];
    subject: string;
    signature?: string;
    attachments?: Attachment[];
};

export type EmailPayload = EmailBody & {
    user: UserDocument;
};

const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GMAIL_SEND_ENDPOINT = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
const OUTLOOK_SEND_ENDPOINT = 'https://graph.microsoft.com/v1.0/me/sendMail';
const MICROSOFT_TOKEN_ENDPOINT = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';

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

const encodeHeaderValue = (value: string): string => {
    // Check if the value contains non-ASCII characters
    if (/[^\x00-\x7F]/.test(value)) {
        // RFC 2047 MIME encoding: =?charset?encoding?encoded-text?=
        const encoded = Buffer.from(value).toString('base64');
        return `=?UTF-8?B?${encoded}?=`;
    }
    return value;
};

const buildRawMessage = (from: string, to: string[], subject: string, content: string, attachments?: Attachment[]) => {
    if (!attachments || attachments.length === 0) {
        const headers = [
            `From: ${from}`,
            `To: ${to.join(', ')}`,
            `Subject: ${encodeHeaderValue(subject)}`,
            'Content-Type: text/html; charset="UTF-8"'
        ];

        const message = `${headers.join('\r\n')}\r\n\r\n${content}`;
        return base64UrlEncode(message);
    }

    const boundary = `boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const headers = [
        `From: ${from}`,
        `To: ${to.join(', ')}`,
        `Subject: ${encodeHeaderValue(subject)}`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/mixed; boundary="${boundary}"`
    ];

    const parts: string[] = [];

    // HTML body part
    parts.push(
        `--${boundary}\r\n` +
        'Content-Type: text/html; charset="UTF-8"\r\n\r\n' +
        content
    );

    // Attachment parts
    for (const attachment of attachments) {
        const base64Content = attachment.content.toString('base64');
        parts.push(
            `--${boundary}\r\n` +
            `Content-Type: ${attachment.mimeType}; name="${encodeHeaderValue(attachment.filename)}"\r\n` +
            'Content-Transfer-Encoding: base64\r\n' +
            `Content-Disposition: attachment; filename="${encodeHeaderValue(attachment.filename)}"\r\n\r\n` +
            base64Content
        );
    }

    const message = `${headers.join('\r\n')}\r\n\r\n${parts.join('\r\n')}\r\n--${boundary}--`;
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

    const response = await sendRequest({
        method: 'POST',
        url: GOOGLE_TOKEN_ENDPOINT,
        data: payload,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    });

    const data = response.data as { access_token?: string; expires_in?: number; error_description?: string };

    if (response.status >= 400 || !data.access_token) {
        throw new UNAUTHORIZED_ERROR(data.error_description || 'Unable to refresh Google access token');
    }

    return data.access_token;
};

const refreshMicrosoftAccessToken = async (refreshToken: string): Promise<string> => {
    if (!settings.MICROSOFT_CLIENT_ID || !settings.MICROSOFT_CLIENT_SECRET) {
        throw new BAD_REQUEST_ERROR('Microsoft OAuth configuration is missing');
    }

    const payload = new URLSearchParams({
        client_id: settings.MICROSOFT_CLIENT_ID,
        client_secret: settings.MICROSOFT_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        scope: 'https://graph.microsoft.com/Mail.Send offline_access',
    });

    const response = await sendRequest({
        method: 'POST',
        url: MICROSOFT_TOKEN_ENDPOINT,
        data: payload.toString(),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const data = response.data as { access_token?: string; error_description?: string };
    if (response.status >= 400 || !data.access_token) {
        throw new UNAUTHORIZED_ERROR(data.error_description || 'Unable to refresh Microsoft access token');
    }

    return data.access_token;
};

const sendWithOutlookApi = async (
    accessToken: string,
    from: string,
    to: string[],
    subject: string,
    content: string,
    attachments?: Attachment[],
) => {
    const { html: processedContent, images: inlineImages } = extractInlineImages(content);

    const allAttachments: unknown[] = attachments?.map((att) => ({
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: att.filename,
        contentType: att.mimeType,
        contentBytes: att.content.toString('base64'),
        isInline: false,
    })) ?? [];

    for (const img of inlineImages) {
        allAttachments.push({
            '@odata.type': '#microsoft.graph.fileAttachment',
            name: img.contentId,
            contentType: img.mimeType,
            contentBytes: img.contentBytes,
            contentId: img.contentId,
            isInline: true,
        });
    }

    const message: Record<string, unknown> = {
        subject,
        body: { contentType: 'HTML', content: processedContent },
        toRecipients: to.map((address) => ({ emailAddress: { address } })),
        from: { emailAddress: { address: from } },
    };

    if (allAttachments.length > 0) {
        message.attachments = allAttachments;
    }

    const body = { message, saveToSentItems: true };

    const response = await sendRequest({
        method: 'POST',
        url: OUTLOOK_SEND_ENDPOINT,
        data: body,
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
    });

    logger.info('Outlook API response', { status: response.status, from, recipients: to, data: response.data });

    if (response.status === 401) {
        return { needRefresh: true } as const;
    }

    if (response.status >= 400) {
        const data = response.data as { error?: { code?: string; message?: string } };
        const errMsg = data.error?.message || JSON.stringify(data) || 'Failed to send email with Outlook API';
        logger.error('Outlook send failed', { status: response.status, error: data.error });
        throw new BAD_REQUEST_ERROR(errMsg);
    }

    return { needRefresh: false } as const;
};

const sendWithGmailApi = async (accessToken: string, rawMessage: string) => {
    const response = await sendRequest({
        method: 'POST',
        url: GMAIL_SEND_ENDPOINT,
        data: { raw: rawMessage },
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        }
    });

    if (response.status === 401) {
        return { needRefresh: true, messageId: null } as const;
    }

    const data = response.data as { id?: string; error?: { message?: string } };

    if (response.status >= 400 || !data.id) {
        throw new BAD_REQUEST_ERROR(data.error?.message || 'Failed to send email with Gmail API');
    }

    return { needRefresh: false, messageId: data.id } as const;
};

export const sendEmail = async ({ content, receivers, user, subject, signature, attachments }: EmailPayload) => {
    if (!content || typeof content !== 'string' || !content.trim()) {
        throw new BAD_REQUEST_ERROR('content is required');
    }

    if (!Array.isArray(receivers) || receivers.length === 0) {
        throw new BAD_REQUEST_ERROR('receivers must be a non-empty array');
    }

    const uniqueReceivers = Array.from(new Set(receivers.map((receiver) => receiver.trim().toLowerCase())));


    const cleanedSignature = signature ? cleanSignatureHtml(signature) : '';
    const bodyContent = content.trim() + (cleanedSignature ? '\n\n' + cleanedSignature : '');

    // Determine sending account: use active connected account if set, else fall back to login Google account
    logger.info('sendEmail: activeAccountId=' + user.activeAccountId + ' connectedAccounts=' + JSON.stringify((user.connectedAccounts || []).map((a: any) => ({ id: a._id.toString(), provider: a.provider, email: a.email }))));
    const activeAccount = user.activeAccountId
        ? (user.connectedAccounts || []).find((acc: any) => acc._id.toString() === String(user.activeAccountId))
        : null;
    logger.info('sendEmail: activeAccount=' + JSON.stringify(activeAccount ? { provider: activeAccount.provider, email: activeAccount.email } : null));

    if (activeAccount && activeAccount.provider === 'outlook') {
        // Send via Microsoft Graph / Outlook
        let accessToken = activeAccount.accessToken;
        let sendResult = await sendWithOutlookApi(accessToken, activeAccount.email, uniqueReceivers, subject, bodyContent, attachments);

        if (sendResult.needRefresh) {
            accessToken = await refreshMicrosoftAccessToken(activeAccount.refreshToken!);
            await User.findOneAndUpdate(
                { _id: user._id, 'connectedAccounts._id': user.activeAccountId },
                { $set: { 'connectedAccounts.$.accessToken': accessToken } }
            );
            sendResult = await sendWithOutlookApi(accessToken, activeAccount.email, uniqueReceivers, subject, bodyContent, attachments);
        }

        if (sendResult.needRefresh) {
            throw new UNAUTHORIZED_ERROR('Unable to send email after refreshing Outlook token');
        }

        logger.info('Email sent via Outlook API', { receiverCount: uniqueReceivers.length });

        return {
            content: content.trim(),
            receivers: uniqueReceivers,
            status: 'sent',
            messageId: null,
        };
    }

    // Gmail path: use active Gmail connected account or login account
    const gmailRefreshToken = activeAccount?.provider === 'gmail'
        ? activeAccount.refreshToken
        : user.googleRefreshToken;

    const rawMessage = buildRawMessage(
        activeAccount?.email || user.email,
        uniqueReceivers,
        subject,
        bodyContent,
        attachments
    );

    let accessToken = activeAccount?.provider === 'gmail'
        ? activeAccount.accessToken
        : user.googleAccessToken;

    let sendResult = await sendWithGmailApi(accessToken, rawMessage);

    if (sendResult.needRefresh) {
        accessToken = await refreshGoogleAccessToken(gmailRefreshToken!);
        if (activeAccount?.provider === 'gmail') {
            await User.findOneAndUpdate(
                { _id: user._id, 'connectedAccounts._id': user.activeAccountId },
                { $set: { 'connectedAccounts.$.accessToken': accessToken } }
            );
        } else {
            await User.findByIdAndUpdate(user._id, { googleAccessToken: accessToken });
        }
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
        messageId: sendResult.messageId,
    };
};

type SendCampaignPayload = {
    campaignId: string;
    userId: string;
};

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

export const sendCampaignEmails = async ({ campaignId, userId }: SendCampaignPayload) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new UNAUTHORIZED_ERROR('User not found');
    }

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
        throw new BAD_REQUEST_ERROR('Campaign not found');
    }
    if (campaign.user_id.toString() !== userId) {
        throw new UNAUTHORIZED_ERROR('You do not have permission to send this campaign');
    }

    // Load attachments from disk
    let emailAttachments: Attachment[] | undefined;
    if (campaign.attachments && campaign.attachments.length > 0) {
        emailAttachments = campaign.attachments.map((att) => ({
            filename: att.filename,
            mimeType: att.mimeType,
            content: readFile(campaignId, att.storedName),
        }));
    }

    const activeAccount = user.activeAccountId
        ? (user.connectedAccounts || []).find((acc: any) => acc._id.toString() === String(user.activeAccountId))
        : null;
    const senderEmail = activeAccount?.email || user.email;

    const matchedSignature = await Signature.findOne({ userId, sourceEmail: senderEmail }).lean()
        ?? await Signature.findOne({ userId, isDefault: true }).lean();
    const signature = matchedSignature?.content || '';

    const fields = Object.keys(campaign.recipients[0]);

    for (const recipient of campaign.recipients) {
        const emailAddress = recipient['Email'];
        const personalizedContent = processContent(campaign.content, recipient, fields);
        await sendEmail({
            content: personalizedContent,
            receivers: [emailAddress],
            user,
            subject: campaign.subject,
            signature,
            attachments: emailAttachments,
        });
    }
}
