import mongoose, { Document, Schema } from 'mongoose';
import { Campaign } from '../schema/campaign.schema';

export type EmailJobStatus = 'pending' | 'sent' | 'failed' | 'cancelled';

export type EmailJob = {
  recipientData: Record<string, string>;
  status: EmailJobStatus;
  scheduledAt: Date;
  sentAt: Date | null;
  error: string | null;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type CampaignStatus = 'draft' | 'sending' | 'completed' | 'failed';
export type SendMode = 'now' | 'schedule_all' | 'schedule_individual';

export type CampaignDocument = Omit<Campaign, 'user_id'> & Document & {
  user_id: mongoose.Types.ObjectId;
  status: CampaignStatus;
  sendMode: SendMode | null;
  email_jobs: Record<string, EmailJob>;
  createdAt: Date;
  updatedAt: Date;
};

const AttachmentSchema = new Schema({
  filename: { type: String, required: true },
  storedName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
}, { _id: false });

const CampaignSchema = new Schema<CampaignDocument>({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  subject: { type: String, required: true },
  content: { type: String, required: true },
  recipients: { type: [Object], required: true },
  attachments: { type: [AttachmentSchema], default: [] },
  status: {
    type: String,
    enum: ['draft', 'sending', 'completed', 'failed'],
    default: 'draft',
  },
  sendMode: {
    type: String,
    enum: ['now', 'schedule_all', 'schedule_individual'],
    default: null,
  },
  email_jobs: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });

export default mongoose.model<CampaignDocument>('Campaign', CampaignSchema);
