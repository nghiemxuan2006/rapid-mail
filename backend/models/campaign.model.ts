import mongoose, { Document, Schema } from 'mongoose';
import { Recipient } from '../schema/email.schema';

export interface ICampaign extends Document {
    user_id: mongoose.Schema.Types.ObjectId;
    name: string;
    subject: string;
    content: string;
    recipients: Recipient[];
    createdAt: Date;
    updatedAt: Date;
}

const CampaignSchema = new Schema<ICampaign>({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    subject: { type: String, required: true },
    content: { type: String, required: true },
    recipients: { type: [Object], required: true },
}, { timestamps: true });

export default mongoose.model<ICampaign>('Campaign', CampaignSchema);
