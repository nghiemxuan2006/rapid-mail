import { Request, Response, NextFunction } from 'express';
import { extractToken } from '../utils/token';
import { FORBIDDEN_ERROR, UNAUTHORIZED_ERROR } from '../utils/error';
import { verifyAccessToken } from '../services/auth.service';
import { findUserById } from '../repositories/user.repository';

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const verifyToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const accessToken =
      extractToken(req.header('Authorization')) || extractToken(req.header('Token'));

    if (!accessToken) {
      throw new UNAUTHORIZED_ERROR('No token provided');
    }

    // Verify token using auth service
    const decoded = verifyAccessToken(accessToken);

    const user = await findUserById((decoded as { sub: string }).sub);
    if (!user) {
      throw new UNAUTHORIZED_ERROR('User not found');
    }
    if (!user.isActive) {
      throw new FORBIDDEN_ERROR('This account has been disabled');
    }

    req.user = decoded;

    next();
  } catch (error) {
    next(error);
  }
};

export default verifyToken;
