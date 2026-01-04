import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
    name: string;
    email: string;
    googleAccessToken: string;
    googleRefreshToken: string;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    googleAccessToken: { type: String, required: true },
    googleRefreshToken: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);
