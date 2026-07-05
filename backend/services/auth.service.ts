import * as jwt from 'jsonwebtoken';
import settings from '../config/env';
import { BAD_REQUEST_ERROR, UNAUTHORIZED_ERROR } from '../utils/error';
import { UserDocument } from '../models/user.model';
import { sendRequest } from '../utils/send-request';
import {
  findUserById,
  findUserByEmail,
  upsertUserByEmail,
  updateUserById,
  updateUserConnectedAccountToken,
  pushConnectedAccount,
  updateConnectedAccountTokens,
  setActiveAccountId,
  saveUser,
} from '../repositories/user.repository';

type GoogleTokenResponse = {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expires_in: number;
  id_token?: string;
};

type MicrosoftTokenResponse = {
  access_token: string;
  refresh_token: string;
  id_token?: string;
  scope: string;
  token_type: string;
  expires_in: number;
};

type MicrosoftProfile = {
  email: string;
  displayName: string;
};

type GoogleProfile = {
  email: string;
  name: string;
};

const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v2/userinfo';

const ensureGoogleConfig = () => {
  if (
    !settings.GOOGLE_CLIENT_ID ||
    !settings.GOOGLE_CLIENT_SECRET ||
    !settings.GOOGLE_REDIRECT_URI
  ) {
    throw new BAD_REQUEST_ERROR('Google OAuth configuration is missing');
  }
};

const exchangeAuthorizationCode = async (authorizeCode: string): Promise<GoogleTokenResponse> => {
  ensureGoogleConfig();

  const payload = {
    code: authorizeCode,
    client_id: settings.GOOGLE_CLIENT_ID,
    client_secret: settings.GOOGLE_CLIENT_SECRET,
    redirect_uri: settings.GOOGLE_REDIRECT_URI,
    grant_type: 'authorization_code',
  };

  const response = await sendRequest({ method: 'POST', url: GOOGLE_TOKEN_ENDPOINT, data: payload });
  const data = response.data as Partial<GoogleTokenResponse> & { error_description?: string };

  if (response.status >= 400) {
    throw new UNAUTHORIZED_ERROR(
      data.error_description || 'Failed to exchange authorize_code with Google',
    );
  }

  if (!data.access_token || !data.refresh_token) {
    throw new UNAUTHORIZED_ERROR('Google did not return access_token or refresh_token');
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    scope: data.scope || '',
    token_type: data.token_type || 'Bearer',
    expires_in: data.expires_in || 0,
    id_token: data.id_token,
  };
};

const fetchGoogleProfile = async (accessToken: string): Promise<GoogleProfile> => {
  const response = await sendRequest({
    method: 'GET',
    url: GOOGLE_USERINFO_ENDPOINT,
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = response.data as { email?: string; name?: string; error?: { message?: string } };

  if (response.status >= 400) {
    throw new UNAUTHORIZED_ERROR(data.error?.message || 'Failed to fetch Google profile');
  }

  if (!data.email) {
    throw new UNAUTHORIZED_ERROR('Google profile does not include an email');
  }

  return { email: data.email, name: data.name || data.email };
};

const persistUser = async (
  profile: GoogleProfile,
  tokens: GoogleTokenResponse,
): Promise<UserDocument> => {
  const user = await upsertUserByEmail(profile.email, {
    name: profile.name,
    email: profile.email,
    googleAccessToken: tokens.access_token,
    googleRefreshToken: tokens.refresh_token,
  });

  if (!user) throw new BAD_REQUEST_ERROR('Unable to persist user');
  return user;
};

const createAppTokens = (user: UserDocument) => {
  const payload = { sub: user._id.toString(), email: user.email, name: user.name };
  const secret: jwt.Secret = settings.JWT_SECRET_KEY || 'fallback-secret';

  const accessToken = jwt.sign(payload, secret, {
    expiresIn: (settings.ACCESS_TOKEN_EXPIRES_IN || '15m') as jwt.SignOptions['expiresIn'],
  });
  const refreshToken = jwt.sign({ ...payload, type: 'refresh' }, secret, {
    expiresIn: (settings.REFRESH_TOKEN_EXPIRES_IN || '30d') as jwt.SignOptions['expiresIn'],
  });

  return { accessToken, refreshToken };
};

const verifyRefreshToken = (token: string) => {
  try {
    const secret = settings.JWT_SECRET_KEY || 'fallback-secret';
    const decoded = jwt.verify(token, secret) as jwt.JwtPayload & { sub?: string; type?: string };
    if (decoded.type !== 'refresh') throw new UNAUTHORIZED_ERROR('Token is not a refresh token');
    return decoded;
  } catch {
    throw new UNAUTHORIZED_ERROR('Invalid or expired refresh token');
  }
};

const refreshAppToken = async (refreshToken: string) => {
  if (!refreshToken) throw new BAD_REQUEST_ERROR('refresh_token is required');

  const decoded = verifyRefreshToken(refreshToken);
  if (!decoded.sub) throw new UNAUTHORIZED_ERROR('Refresh token missing subject');

  const user = await findUserById(decoded.sub);
  if (!user) throw new UNAUTHORIZED_ERROR('User not found');

  return createAppTokens(user);
};

const loginWithGoogle = async (authorizeCode: string) => {
  const googleTokens = await exchangeAuthorizationCode(authorizeCode);
  const profile = await fetchGoogleProfile(googleTokens.access_token);
  const user = await persistUser(profile, googleTokens);
  return createAppTokens(user);
};

const verifyAccessToken = (token: string) => {
  try {
    const secret = settings.JWT_SECRET_KEY || 'fallback-secret';
    return jwt.verify(token, secret);
  } catch {
    throw new UNAUTHORIZED_ERROR('Invalid or expired access token');
  }
};

const getUserProfile = async (userId: string) => {
  if (!userId) throw new UNAUTHORIZED_ERROR('User ID not found in token');

  const user = await findUserById(userId);
  if (!user) throw new UNAUTHORIZED_ERROR('User not found in database');

  return {
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    activeAccountId: user.activeAccountId || null,
    connectedAccounts: (user.connectedAccounts || []).map((acc: any) => ({
      id: acc._id.toString(),
      email: acc.email,
      provider: acc.provider,
    })),
  };
};

const MICROSOFT_TOKEN_ENDPOINT = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const MICROSOFT_USERINFO_ENDPOINT = 'https://graph.microsoft.com/oidc/userinfo';

const exchangeMicrosoftAuthorizationCode = async (
  authorizeCode: string,
): Promise<MicrosoftTokenResponse> => {
  if (!settings.MICROSOFT_CLIENT_ID || !settings.MICROSOFT_CLIENT_SECRET) {
    throw new BAD_REQUEST_ERROR('Microsoft OAuth configuration is missing');
  }

  const payload = new URLSearchParams({
    code: authorizeCode,
    client_id: settings.MICROSOFT_CLIENT_ID,
    client_secret: settings.MICROSOFT_CLIENT_SECRET,
    redirect_uri: settings.MICROSOFT_REDIRECT_URI,
    grant_type: 'authorization_code',
  });

  const response = await sendRequest({
    method: 'POST',
    url: MICROSOFT_TOKEN_ENDPOINT,
    data: payload.toString(),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  const data = response.data as Partial<MicrosoftTokenResponse> & { error_description?: string };

  if (response.status >= 400) {
    throw new BAD_REQUEST_ERROR(data.error_description || 'Failed to exchange code with Microsoft');
  }

  if (!data.access_token || !data.refresh_token) {
    throw new BAD_REQUEST_ERROR('Microsoft did not return access_token or refresh_token');
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    id_token: data.id_token,
    scope: data.scope || '',
    token_type: data.token_type || 'Bearer',
    expires_in: data.expires_in || 0,
  };
};

const extractMicrosoftProfile = (idToken: string | undefined): MicrosoftProfile => {
  if (!idToken) throw new BAD_REQUEST_ERROR('Microsoft did not return id_token');

  const payload = idToken.split('.')[1];
  if (!payload) throw new BAD_REQUEST_ERROR('Invalid id_token format');

  const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
  const email = decoded.email || decoded.preferred_username || decoded.upn;
  if (!email) throw new BAD_REQUEST_ERROR('Microsoft id_token does not include an email');

  return { email, displayName: decoded.name || email };
};

const mapAccounts = (connectedAccounts: any[]) =>
  connectedAccounts.map((acc: any) => ({
    id: acc._id.toString(),
    email: acc.email,
    provider: acc.provider,
  }));

const connectGmailAccount = async (userId: string, authorizeCode: string) => {
  const googleTokens = await exchangeAuthorizationCode(authorizeCode);
  const profile = await fetchGoogleProfile(googleTokens.access_token);

  const user = await findUserById(userId);
  if (!user) throw new UNAUTHORIZED_ERROR('User not found');

  const alreadyConnected = (user.connectedAccounts || []).some(
    (acc: any) => acc.email === profile.email && acc.provider === 'gmail',
  );

  if (alreadyConnected) {
    await updateConnectedAccountTokens(
      userId,
      profile.email,
      'gmail',
      googleTokens.access_token,
      googleTokens.refresh_token,
    );
  } else {
    await pushConnectedAccount(userId, {
      email: profile.email,
      provider: 'gmail',
      accessToken: googleTokens.access_token,
      refreshToken: googleTokens.refresh_token,
    });
  }

  const updatedUser = await findUserById(userId);
  return {
    activeAccountId: updatedUser?.activeAccountId || null,
    connectedAccounts: mapAccounts(updatedUser?.connectedAccounts || []),
  };
};

const connectOutlookAccount = async (userId: string, authorizeCode: string) => {
  const msTokens = await exchangeMicrosoftAuthorizationCode(authorizeCode);
  const profile = extractMicrosoftProfile(msTokens.id_token);

  const user = await findUserById(userId);
  if (!user) throw new UNAUTHORIZED_ERROR('User not found');

  const alreadyConnected = (user.connectedAccounts || []).some(
    (acc: any) => acc.email === profile.email && acc.provider === 'outlook',
  );

  if (alreadyConnected) {
    await updateConnectedAccountTokens(
      userId,
      profile.email,
      'outlook',
      msTokens.access_token,
      msTokens.refresh_token,
    );
  } else {
    await pushConnectedAccount(userId, {
      email: profile.email,
      provider: 'outlook',
      accessToken: msTokens.access_token,
      refreshToken: msTokens.refresh_token,
    });
  }

  const updatedUser = await findUserById(userId);
  return {
    activeAccountId: updatedUser?.activeAccountId || null,
    connectedAccounts: mapAccounts(updatedUser?.connectedAccounts || []),
  };
};

const disconnectAccount = async (userId: string, accountId: string) => {
  const user = await findUserById(userId);
  if (!user) throw new UNAUTHORIZED_ERROR('User not found');

  user.connectedAccounts = (user.connectedAccounts || []).filter(
    (acc: any) => acc._id.toString() !== accountId,
  );

  if (user.activeAccountId != null && String(user.activeAccountId) === accountId) {
    user.activeAccountId = null;
  }

  user.markModified('connectedAccounts');
  await saveUser(user);

  return {
    activeAccountId: user.activeAccountId || null,
    connectedAccounts: mapAccounts(user.connectedAccounts),
  };
};

const setActiveAccount = async (userId: string, accountId: string) => {
  const user = await findUserById(userId);
  if (!user) throw new BAD_REQUEST_ERROR('User not found');

  const accountExists = (user.connectedAccounts || []).some(
    (acc: any) => acc._id.toString() === accountId,
  );
  if (!accountExists) throw new BAD_REQUEST_ERROR('Connected account not found');

  await setActiveAccountId(userId, accountId);
  return { activeAccountId: accountId };
};

export {
  loginWithGoogle,
  verifyAccessToken,
  refreshAppToken,
  getUserProfile,
  connectGmailAccount,
  connectOutlookAccount,
  disconnectAccount,
  setActiveAccount,
};
