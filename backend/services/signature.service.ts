import User from '../models/user.model';
import { UNAUTHORIZED_ERROR, BAD_REQUEST_ERROR } from '../utils/error';
import settings from '../config/env';

const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GMAIL_SIGNATURE_ENDPOINT = 'https://gmail.googleapis.com/gmail/v1/users/me/settings/sendAs';

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

export const getSignatureList = async (userId: string) => {
    const user = await User.findById(userId);

    if (!user) {
        throw new UNAUTHORIZED_ERROR('User not found');
    }

    let accessToken = user.googleAccessToken;
    let response = await fetch(GMAIL_SIGNATURE_ENDPOINT, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        }
    });

    // If token expired, refresh and retry
    if (response.status === 401) {
        accessToken = await refreshGoogleAccessToken(user.googleRefreshToken);
        user.googleAccessToken = accessToken;
        await user.save();

        response = await fetch(GMAIL_SIGNATURE_ENDPOINT, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
    }

    if (!response.ok) {
        const errorData = await response.json() as { error?: { message?: string } };
        throw new BAD_REQUEST_ERROR(errorData.error?.message || 'Failed to fetch signature from Gmail API');
    }

    const data = await response.json();
    return data;
};
