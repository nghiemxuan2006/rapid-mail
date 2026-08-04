import mongoose, { Document, Schema } from 'mongoose';

export type ReplyDocument = Document & {
  campaignId: mongoose.Types.ObjectId;
  jobId: string;
  recipientEmail: string;
  threadId: string;
  replyMessageId: string;
  gmailUrl: string;
  snippet: string;
  receivedAt: Date;
  isRead: boolean;
  userId: mongoose.Types.ObjectId;
};

const ReplySchema = new Schema<ReplyDocument>({
  campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true },
  jobId: { type: String, required: true },
  recipientEmail: { type: String, required: true },
  threadId: { type: String, required: true },
  replyMessageId: { type: String, required: true, unique: true },
  gmailUrl: { type: String, default: '' },
  snippet: { type: String, default: '' },
  receivedAt: { type: Date, required: true },
  isRead: { type: Boolean, default: false },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
});

ReplySchema.index({ userId: 1, isRead: 1 });
ReplySchema.index({ threadId: 1 });
ReplySchema.index({ campaignId: 1 });

export default mongoose.model<ReplyDocument>('Reply', ReplySchema);
