import mongoose, { Document, Schema } from 'mongoose';
import { Recipient } from '../schema/email.schema';

export interface ICampaign extends Document {
    name: string;
    subject: string;
    content: string;
    recipients: Recipient[];
    createdAt: Date;
    updatedAt: Date;
}

const CampaignSchema = new Schema<ICampaign>({
    name: { type: String, required: true },
    subject: { type: String, required: true },
    content: { type: String, required: true },
    recipients: { type: [Object], required: true },
}, { timestamps: true });

export default mongoose.model<ICampaign>('Campaign', CampaignSchema);
