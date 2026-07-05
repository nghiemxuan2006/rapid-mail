import { Request, Response, NextFunction } from 'express';
import { FORBIDDEN_ERROR } from '../utils/error';
import { findUserById } from '../repositories/user.repository';

export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await findUserById(req.user.sub);

    if (!user || user.role !== 'admin') {
      throw new FORBIDDEN_ERROR('Admin access required');
    }

    next();
  } catch (error) {
    next(error);
  }
};

export default requireAdmin;
