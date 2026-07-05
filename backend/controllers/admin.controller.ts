import { NextFunction, Request, Response } from 'express';
import { BAD_REQUEST_ERROR, NOT_FOUND_ERROR } from '../utils/error';
import { ListUsersQuery, UpdateUserActiveBody, UpdateUserRoleBody, UserParams } from '../schema/admin.schema';
import { ListFeedbackQuery, UpdateFeedbackStatusBody, FeedbackParams } from '../schema/feedback.schema';
import { findAllUsers, updateUserById, deleteUserById, findUserById } from '../repositories/user.repository';
import {
  findAllFeedback,
  findFeedbackById,
  updateFeedbackStatusById,
  deleteFeedbackById,
} from '../repositories/feedback.repository';

// ===== Users =====

export const listUsers = async (
  req: Request<{}, {}, {}, ListUsersQuery>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const users = await findAllUsers(req.query.search);
    res.json({ message: 'Users retrieved successfully', data: users });
  } catch (error) {
    next(error);
  }
};

export const updateUserRole = async (
  req: Request<UserParams, {}, UpdateUserRoleBody>,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (req.params.id === req.user.sub) {
      throw new BAD_REQUEST_ERROR('Bạn không thể tự đổi role của chính mình');
    }

    const user = await updateUserById(req.params.id, { role: req.body.role });
    if (!user) throw new NOT_FOUND_ERROR('User not found');

    res.json({ message: 'User role updated successfully', data: user });
  } catch (error) {
    next(error);
  }
};

export const updateUserActive = async (
  req: Request<UserParams, {}, UpdateUserActiveBody>,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (req.params.id === req.user.sub) {
      throw new BAD_REQUEST_ERROR('Bạn không thể tự khóa tài khoản của chính mình');
    }

    const user = await updateUserById(req.params.id, { isActive: req.body.isActive });
    if (!user) throw new NOT_FOUND_ERROR('User not found');

    res.json({ message: 'User status updated successfully', data: user });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req: Request<UserParams>, res: Response, next: NextFunction) => {
  try {
    if (req.params.id === req.user.sub) {
      throw new BAD_REQUEST_ERROR('Bạn không thể tự xóa tài khoản của chính mình');
    }

    const user = await findUserById(req.params.id);
    if (!user) throw new NOT_FOUND_ERROR('User not found');

    await deleteUserById(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ===== Feedback =====

export const listFeedback = async (
  req: Request<{}, {}, {}, ListFeedbackQuery>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const feedback = await findAllFeedback({ type: req.query.type, status: req.query.status });
    res.json({ message: 'Feedback retrieved successfully', data: feedback });
  } catch (error) {
    next(error);
  }
};

export const updateFeedbackStatus = async (
  req: Request<FeedbackParams, {}, UpdateFeedbackStatusBody>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const feedback = await updateFeedbackStatusById(req.params.id, req.body.status);
    if (!feedback) throw new NOT_FOUND_ERROR('Feedback not found');

    res.json({ message: 'Feedback status updated successfully', data: feedback });
  } catch (error) {
    next(error);
  }
};

export const deleteFeedback = async (req: Request<FeedbackParams>, res: Response, next: NextFunction) => {
  try {
    const feedback = await findFeedbackById(req.params.id);
    if (!feedback) throw new NOT_FOUND_ERROR('Feedback not found');

    await deleteFeedbackById(req.params.id);
    res.json({ message: 'Feedback deleted successfully' });
  } catch (error) {
    next(error);
  }
};
