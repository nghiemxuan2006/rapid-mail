import mongoose, { Document, Schema } from 'mongoose';
import { User } from '../schema/user.schema';

export type UserDocument = User & Document & {
  createdAt: Date;
  updatedAt: Date;
};

const UserSchema = new Schema<UserDocument>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  googleAccessToken: { type: String, required: true },
  googleRefreshToken: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model<UserDocument>('User', UserSchema);
