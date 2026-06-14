import Signature from '../models/signature.model';
import { CreateSignatureBody, UpdateMySignatureBody } from '../schema/signature.schema';

export const findSignaturesByUserId = (userId: string) =>
  Signature.find({ userId }).sort({ isDefault: -1, createdAt: -1 }).lean();

export const findSignatureByUserAndId = (userId: string, signatureId: string) =>
  Signature.findOne({ _id: signatureId, userId });

export const findDefaultSignature = (userId: string) =>
  Signature.findOne({ userId, isDefault: true }).lean();

export const findSignatureByEmail = (userId: string, sourceEmail: string) =>
  Signature.findOne({ userId, sourceEmail }).lean();

export const findDefaultSignatureByEmail = (userId: string, sourceEmail: string) =>
  Signature.findOne({ userId, sourceEmail, isDefault: true }).lean();

export const createSignature = (userId: string, body: CreateSignatureBody) =>
  Signature.create({ userId, ...body });

export const updateSignatureByUserAndId = (
  userId: string,
  signatureId: string,
  body: UpdateMySignatureBody,
) =>
  Signature.findOneAndUpdate(
    { _id: signatureId, userId },
    { $set: body },
    { new: true },
  );

export const deleteSignatureByUserAndId = (userId: string, signatureId: string) =>
  Signature.findOneAndDelete({ _id: signatureId, userId });

export const clearDefaultSignatures = (userId: string) =>
  Signature.updateMany({ userId }, { isDefault: false });
