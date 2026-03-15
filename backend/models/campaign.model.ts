import mongoose, { Document, Schema } from 'mongoose';
import { Campaign } from '../schema/campaign.schema';

// Omit user_id from Zod type (string) — Mongoose defines it as ObjectId
export type CampaignDocument = Omit<Campaign, 'user_id'> & Document & {
  user_id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const CampaignSchema = new Schema<CampaignDocument>({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  subject: { type: String, required: true },
  content: { type: String, required: true },
  recipients: { type: [Object], required: true },
}, { timestamps: true });

export default mongoose.model<CampaignDocument>('Campaign', CampaignSchema);
