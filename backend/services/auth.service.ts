import * as jwt from 'jsonwebtoken';
import { UNAUTHORIZED_ERROR } from '../utils/error';
import settings from '../config/env';


// Verify access token
const verifyAccessToken = (token: string) => {
    try {
        const secret = settings.JWT_SECRET_KEY || 'fallback-secret';
        return jwt.verify(token, secret);
    } catch (error) {
        throw new UNAUTHORIZED_ERROR('Invalid or expired access token');
    }
}

export {
    verifyAccessToken
};