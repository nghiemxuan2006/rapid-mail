import mongoose, { Document, Schema } from 'mongoose';
import { Feedback } from '../schema/feedback.schema';

export type FeedbackDocument = Omit<Feedback, 'user_id'> &
  Document & {
    user_id: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
  };

const FeedbackSchema = new Schema<FeedbackDocument>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['bug', 'feature', 'general'], required: true },
    title: { type: String, required: true, maxlength: 100 },
    message: { type: String, required: true, maxlength: 2000 },
    status: { type: String, enum: ['pending', 'in_progress', 'resolved'], default: 'pending' },
  },
  { timestamps: true },
);

export default mongoose.model<FeedbackDocument>('Feedback', FeedbackSchema);
