import { Request, Response, NextFunction } from 'express';
import { extractToken } from '../utils/token';
import { UNAUTHORIZED_ERROR } from '../utils/error';
import { verifyAccessToken } from '../services/auth.service';

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accessToken =
      extractToken(req.header('Authorization')) || extractToken(req.header('Token'));

    if (!accessToken) {
      throw new UNAUTHORIZED_ERROR('No token provided');
    }

    // Verify token using auth service
    const decoded = verifyAccessToken(accessToken);
    req.user = decoded;

    next();
  } catch (error) {
    next(error);
  }
};

export default verifyToken;
