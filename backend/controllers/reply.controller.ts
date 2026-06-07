import { Request, Response, NextFunction } from 'express';
import Reply from '../models/reply.model';

export const getReplies = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { unread, campaignId } = req.query;

    const filter: Record<string, unknown> = { userId };
    if (unread === 'true') filter.isRead = false;
    if (campaignId) filter.campaignId = campaignId;

    const replies = await Reply.find(filter)
      .sort({ receivedAt: -1 })
      .limit(50)
      .populate('campaignId', 'name');

    res.json(replies);
  } catch (err) {
    next(err);
  }
};

export const markReplyRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).userId;

    await Reply.findOneAndUpdate({ _id: id, userId }, { isRead: true });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
