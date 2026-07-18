import mongoose from 'mongoose';
import Reply, { ReplyDocument } from '../models/reply.model';

export const findReplies = (
  userId: mongoose.Types.ObjectId,
  filters: { unread?: boolean; campaignId?: string },
): Promise<ReplyDocument[]> => {
  const filter: Record<string, unknown> = { userId };
  if (filters.unread) filter.isRead = false;
  if (filters.campaignId) filter.campaignId = filters.campaignId;

  return Reply.find(filter)
    .sort({ receivedAt: -1 })
    .limit(50)
    .populate('campaignId', 'name');
};

export const findReplyByMessageId = (replyMessageId: string): Promise<ReplyDocument | null> =>
  Reply.findOne({ replyMessageId });

export const markReplyAsRead = (id: string, userId: string): Promise<ReplyDocument | null> =>
  Reply.findOneAndUpdate({ _id: id, userId }, { isRead: true });

export const createReply = (data: {
  campaignId: string;
  jobId: string;
  recipientEmail: string;
  threadId: string;
  replyMessageId: string;
  gmailUrl: string;
  snippet: string;
  receivedAt: Date;
  isRead: boolean;
  userId: unknown;
}): Promise<ReplyDocument> => Reply.create(data);
