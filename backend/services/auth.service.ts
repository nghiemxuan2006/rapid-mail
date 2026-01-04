import * as jwt from 'jsonwebtoken';
import settings from '../config/env';
import { BAD_REQUEST_ERROR, UNAUTHORIZED_ERROR } from '../utils/error';
import User, { IUser } from '../models/user.model';

type GoogleTokenResponse = {
    access_token: string;
    refresh_token: string;
    scope: string;
    token_type: string;
    expires_in: number;
    id_token?: string;
};

type GoogleProfile = {
    email: string;
    name: string;
};

const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v2/userinfo';

const ensureGoogleConfig = () => {
    if (!settings.GOOGLE_CLIENT_ID || !settings.GOOGLE_CLIENT_SECRET || !settings.GOOGLE_REDIRECT_URI) {
        throw new BAD_REQUEST_ERROR('Google OAuth configuration is missing');
    }
};

const exchangeAuthorizationCode = async (authorizeCode: string): Promise<GoogleTokenResponse> => {
    ensureGoogleConfig();

    const payload = new URLSearchParams({
        code: authorizeCode,
        client_id: settings.GOOGLE_CLIENT_ID,
        client_secret: settings.GOOGLE_CLIENT_SECRET,
        redirect_uri: settings.GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code'
    });

    const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: payload
    });

    const data = await response.json() as Partial<GoogleTokenResponse> & { error_description?: string };

    if (!response.ok) {
        throw new UNAUTHORIZED_ERROR(data.error_description || 'Failed to exchange authorize_code with Google');
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
        id_token: data.id_token
    };
};

const fetchGoogleProfile = async (accessToken: string): Promise<GoogleProfile> => {
    const response = await fetch(GOOGLE_USERINFO_ENDPOINT, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });

    const data = await response.json() as { email?: string; name?: string; error?: { message?: string } };

    if (!response.ok) {
        throw new UNAUTHORIZED_ERROR(data.error?.message || 'Failed to fetch Google profile');
    }

    if (!data.email) {
        throw new UNAUTHORIZED_ERROR('Google profile does not include an email');
    }

    return {
        email: data.email,
        name: data.name || data.email
    };
};

const persistUser = async (profile: GoogleProfile, tokens: GoogleTokenResponse): Promise<IUser> => {
    const update = {
        name: profile.name,
        email: profile.email,
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token
    };

    const user = await User.findOneAndUpdate(
        { email: profile.email },
        update,
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    if (!user) {
        throw new BAD_REQUEST_ERROR('Unable to persist user');
    }

    return user;
};

const createAppTokens = (user: IUser) => {
    const payload = {
        sub: user._id.toString(),
        email: user.email,
        name: user.name
    };

    const secret: jwt.Secret = settings.JWT_SECRET_KEY || 'fallback-secret';

    const accessToken = jwt.sign(payload, secret, { expiresIn: (settings.ACCESS_TOKEN_EXPIRES_IN || '15m') as jwt.SignOptions['expiresIn'] });
    const refreshToken = jwt.sign(
        { ...payload, type: 'refresh' },
        secret,
        { expiresIn: (settings.REFRESH_TOKEN_EXPIRES_IN || '30d') as jwt.SignOptions['expiresIn'] }
    );

    return { accessToken, refreshToken };
};

const verifyRefreshToken = (token: string) => {
    try {
        const secret = settings.JWT_SECRET_KEY || 'fallback-secret';
        const decoded = jwt.verify(token, secret) as jwt.JwtPayload & { sub?: string; type?: string };

        if (decoded.type !== 'refresh') {
            throw new UNAUTHORIZED_ERROR('Token is not a refresh token');
        }

        return decoded;
    } catch (error) {
        throw new UNAUTHORIZED_ERROR('Invalid or expired refresh token');
    }
};

const refreshAppToken = async (refreshToken: string) => {
    if (!refreshToken) {
        throw new BAD_REQUEST_ERROR('refresh_token is required');
    }

    const decoded = verifyRefreshToken(refreshToken);

    if (!decoded.sub) {
        throw new UNAUTHORIZED_ERROR('Refresh token missing subject');
    }

    const user = await User.findById(decoded.sub);

    if (!user) {
        throw new UNAUTHORIZED_ERROR('User not found');
    }

    return createAppTokens(user);
};

const loginWithGoogle = async (authorizeCode: string) => {
    const googleTokens = await exchangeAuthorizationCode(authorizeCode);
    const profile = await fetchGoogleProfile(googleTokens.access_token);
    const user = await persistUser(profile, googleTokens);
    const appTokens = createAppTokens(user);

    return {
        ...appTokens
    };
};

// Verify access token
const verifyAccessToken = (token: string) => {
    try {
        const secret = settings.JWT_SECRET_KEY || 'fallback-secret';
        return jwt.verify(token, secret);
    } catch (error) {
        throw new UNAUTHORIZED_ERROR('Invalid or expired access token');
    }
};

export {
    loginWithGoogle,
    verifyAccessToken,
    refreshAppToken
};