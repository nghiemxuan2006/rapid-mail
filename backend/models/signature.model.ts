import mongoose, { Document, Schema } from 'mongoose';

export interface SignatureDocument extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  content: string;
  sourceEmail?: string;
  provider?: 'gmail' | 'outlook';
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SignatureSchema = new Schema<SignatureDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    content: { type: String, default: '' },
    sourceEmail: { type: String },
    provider: { type: String, enum: ['gmail', 'outlook'] },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export default mongoose.model<SignatureDocument>('Signature', SignatureSchema);
