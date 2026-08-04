import { inlineSignatureImages } from '../utils/clean-signature-html';
import { ConnectedAccount } from '../models/user.model';
import { SignatureDocument } from '../models/signature.model';
import { LeanSignature } from '../repositories/signature.repository';
import { UNAUTHORIZED_ERROR, BAD_REQUEST_ERROR, NOT_FOUND_ERROR } from '../utils/error';
import {
  findSignaturesByUserId,
  findDefaultSignatureByEmail,
  findSignatureByEmail,
  findDefaultSignature,
  createSignature,
  updateSignatureByUserAndId,
  deleteSignatureByUserAndId,
  clearDefaultSignatures,
} from '../repositories/signature.repository';
import { findUserById, updateUserConnectedAccountToken } from '../repositories/user.repository';
import settings from '../config/env';
import { sendRequest } from '../utils/send-request';
import { CreateSignatureBody, UpdateMySignatureBody } from '../schema/signature.schema';

const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GMAIL_SEND_AS_ENDPOINT = 'https://gmail.googleapis.com/gmail/v1/users/me/settings/sendAs';

type GmailSendAs = {
  sendAsEmail: string;
  displayName?: string;
  signature?: string;
  isPrimary?: boolean;
  isDefault?: boolean;
  replyToAddress?: string;
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
    grant_type: 'refresh_token',
  });

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: payload,
  });

  const data = (await response.json()) as { access_token?: string; error_description?: string };

  if (!response.ok || !data.access_token) {
    throw new UNAUTHORIZED_ERROR(data.error_description || 'Unable to refresh Google access token');
  }

  return data.access_token;
};

// ─── Gmail import for a specific connected account ───────────────────────────

export const importGmailSignaturesByAccount = async (
  userId: string,
  accountId: string,
): Promise<GmailSendAs[]> => {
  const user = await findUserById(userId);
  if (!user) throw new UNAUTHORIZED_ERROR('User not found');

  const account = user.connectedAccounts.find(
    (acc: ConnectedAccount) => acc._id.toString() === accountId && acc.provider === 'gmail',
  );

  if (!account) throw new BAD_REQUEST_ERROR('Gmail connected account not found');

  let accessToken: string = account.accessToken;

  const tryFetch = (token: string) =>
    sendRequest({
      method: 'GET',
      url: GMAIL_SEND_AS_ENDPOINT,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });

  let response = await tryFetch(accessToken);

  if (response.status === 401 && account.refreshToken) {
    accessToken = await refreshGoogleAccessToken(account.refreshToken);

    // persist refreshed token back into the sub-document
    await updateUserConnectedAccountToken(userId, account._id, accessToken);

    response = await tryFetch(accessToken);
  }

  if (response.status >= 400) {
    const errorData = response.data as { error?: { message?: string } };
    throw new BAD_REQUEST_ERROR(
      errorData.error?.message || 'Failed to fetch signatures from Gmail API',
    );
  }

  const data = response.data as { sendAs?: GmailSendAs[] };
  return data.sendAs || [];
};

// ─── Auto-import the account's Gmail signature at connect time ────────────────
// Creates an app-managed signature from the account's primary sendAs signature.
// Never overwrites an existing signature for that email, never sets it as default.
// Returns the created signature, or null when nothing was imported.
export const autoImportGmailSignatureForAccount = async (
  userId: string,
  accountId: string,
  email: string,
): Promise<SignatureDocument | null> => {
  const sendAsList = await importGmailSignaturesByAccount(userId, accountId);

  const alias =
    sendAsList.find((s) => s.isPrimary) ??
    sendAsList.find((s) => s.sendAsEmail === email) ??
    sendAsList[0];

  const content = alias?.signature?.trim();
  if (!content) return null;

  const existing = await findSignatureByEmail(userId, email);
  if (existing) return null;

  return createSignatureForUser(userId, {
    name: alias?.displayName || email,
    content: alias?.signature ?? '',
    sourceEmail: email,
    provider: 'gmail',
    isDefault: false,
  });
};

// ─── App-managed signatures (MongoDB) ────────────────────────────────────────

export const listSignatures = async (userId: string): Promise<LeanSignature[]> => {
  return findSignaturesByUserId(userId);
};

export const getDefaultSignatureForAccount = async (
  userId: string,
  accountId?: string,
): Promise<LeanSignature | null> => {
  if (accountId) {
    const user = await findUserById(userId);
    const account = user?.connectedAccounts?.find(
      (acc: ConnectedAccount) => acc._id.toString() === accountId,
    );
    if (account?.email) {
      const sig = await findDefaultSignatureByEmail(userId, account.email);
      if (sig) return sig;
      // Fallback: any signature linked to this account
      const fallback = await findSignatureByEmail(userId, account.email);
      if (fallback) return fallback;
    }
  }
  // Fallback: global default
  return findDefaultSignature(userId);
};

export const createSignatureForUser = async (
  userId: string,
  body: CreateSignatureBody,
): Promise<SignatureDocument> => {
  if (body.isDefault) {
    await clearDefaultSignatures(userId);
  }

  if (body.content) {
    body.content = await inlineSignatureImages(body.content);
  }

  const signature = await createSignature(userId, body);
  return signature;
};

export const updateSignature = async (
  userId: string,
  signatureId: string,
  body: UpdateMySignatureBody,
): Promise<SignatureDocument> => {
  if (body.isDefault) {
    await clearDefaultSignatures(userId);
  }

  if (body.content) {
    body.content = await inlineSignatureImages(body.content);
  }

  const signature = await updateSignatureByUserAndId(userId, signatureId, body);

  if (!signature) throw new NOT_FOUND_ERROR('Signature not found');
  return signature;
};

export const deleteSignature = async (
  userId: string,
  signatureId: string,
): Promise<SignatureDocument> => {
  const signature = await deleteSignatureByUserAndId(userId, signatureId);
  if (!signature) throw new NOT_FOUND_ERROR('Signature not found');
  return signature;
};
