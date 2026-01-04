import { Request, Response, NextFunction } from 'express';
import { loginWithGoogle, refreshAppToken } from '../services/auth.service';
import { BAD_REQUEST_ERROR } from '../utils/error';
import { extractToken } from '../utils/token';

const login = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authorizeCode = req.query.authorize_code;

        if (!authorizeCode || typeof authorizeCode !== 'string') {
            throw new BAD_REQUEST_ERROR('authorize_code param is required');
        }

        const result = await loginWithGoogle(authorizeCode);

        res.json(result);
    } catch (error) {
        next(error);
    }
};

const refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const refreshToken = extractToken(req.header('Authorization'));

        if (!refreshToken || typeof refreshToken !== 'string') {
            throw new BAD_REQUEST_ERROR('refresh_token is required');
        }

        const tokens = await refreshAppToken(refreshToken);

        res.json(tokens);
    } catch (error) {
        next(error);
    }
};




export {
    login,
    refresh
};