import mongoose, { Document, Schema } from 'mongoose';
import { User } from '../schema/user.schema';

export type UserDocument = User & Document & {
  createdAt: Date;
  updatedAt: Date;
};

const ConnectedAccountSchema = new Schema({
  email: { type: String, required: true },
  provider: { type: String, enum: ['gmail', 'outlook'], required: true },
  accessToken: { type: String, required: true },
  refreshToken: { type: String },
}, { _id: true });

const UserSchema = new Schema<UserDocument>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  googleAccessToken: { type: String, required: true },
  googleRefreshToken: { type: String, required: true },
  connectedAccounts: { type: [ConnectedAccountSchema], default: [] },
  activeAccountId: { type: String, default: null },
}, { timestamps: true });

export default mongoose.model<UserDocument>('User', UserSchema);
