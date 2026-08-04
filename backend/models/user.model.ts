import mongoose, { Document, Schema } from 'mongoose';
import { User } from '../schema/user.schema';

export type ConnectedAccount = {
  _id: mongoose.Types.ObjectId;
  email: string;
  provider: 'gmail' | 'outlook';
  accessToken: string;
  refreshToken?: string;
  gmailWatchExpiry: Date | null;
  gmailHistoryId: string | null;
};

export type UserDocument = Omit<User, 'connectedAccounts'> &
  Document & {
    createdAt: Date;
    updatedAt: Date;
    connectedAccounts: ConnectedAccount[];
  };

const ConnectedAccountSchema = new Schema(
  {
    email: { type: String, required: true },
    provider: { type: String, enum: ['gmail', 'outlook'], required: true },
    accessToken: { type: String, required: true },
    refreshToken: { type: String },
    gmailWatchExpiry: { type: Date, default: null },
    gmailHistoryId: { type: String, default: null },
  },
  { _id: true },
);

const UserSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    connectedAccounts: { type: [ConnectedAccountSchema], default: [] },
    activeAccountId: { type: String, default: null },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export default mongoose.model<UserDocument>('User', UserSchema);
