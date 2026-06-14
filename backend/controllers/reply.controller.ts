import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import {
  findReplies,
  markReplyAsRead,
} from '../repositories/reply.repository';

export const getReplies = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user?.sub as string);
    const { campaignId, unread } = req.query;

    const replies = await findReplies(userId, {
      campaignId: campaignId as string | undefined,
      unread: unread === 'true',
    });

    res.json({ message: 'Replies fetched successfully', data: replies });
  } catch (err) {
    next(err);
  }
};

export const markReplyRead = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.sub as string;

    const reply = await markReplyAsRead(id, userId);

    res.json({ message: 'Reply marked as read', data: reply });
  } catch (err) {
    next(err);
  }
};
