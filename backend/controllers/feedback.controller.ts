import { NextFunction, Request, Response } from 'express';
import { CreateFeedbackBody } from '../schema/feedback.schema';
import { createFeedback, findFeedbackByUserId } from '../repositories/feedback.repository';

export const submitFeedback = async (
  req: Request<{}, {}, CreateFeedbackBody>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { type, title, message } = req.body;
    const feedback = await createFeedback({ user_id: req.user.sub, type, title, message });
    res.status(201).json({ message: 'Feedback submitted successfully', data: feedback });
  } catch (error) {
    next(error);
  }
};

export const getMyFeedback = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const feedback = await findFeedbackByUserId(req.user.sub);
    res.json({ message: 'Feedback retrieved successfully', data: feedback });
  } catch (error) {
    next(error);
  }
};
