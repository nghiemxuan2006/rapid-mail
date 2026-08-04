import { UpdateWriteOpResult, FlattenMaps } from 'mongoose';
import Signature, { SignatureDocument } from '../models/signature.model';
import { CreateSignatureBody, UpdateMySignatureBody } from '../schema/signature.schema';

export type LeanSignature = FlattenMaps<SignatureDocument> & { _id: SignatureDocument['_id'] };

export const findSignaturesByUserId = (userId: string): Promise<LeanSignature[]> =>
  Signature.find({ userId }).sort({ isDefault: -1, createdAt: -1 }).lean();

export const findSignatureByUserAndId = (
  userId: string,
  signatureId: string,
): Promise<SignatureDocument | null> => Signature.findOne({ _id: signatureId, userId });

export const findDefaultSignature = (userId: string): Promise<LeanSignature | null> =>
  Signature.findOne({ userId, isDefault: true }).lean();

export const findSignatureByEmail = (
  userId: string,
  sourceEmail: string,
): Promise<LeanSignature | null> => Signature.findOne({ userId, sourceEmail }).lean();

export const findDefaultSignatureByEmail = (
  userId: string,
  sourceEmail: string,
): Promise<LeanSignature | null> =>
  Signature.findOne({ userId, sourceEmail, isDefault: true }).lean();

export const createSignature = (
  userId: string,
  body: CreateSignatureBody,
): Promise<SignatureDocument> => Signature.create({ userId, ...body });

export const updateSignatureByUserAndId = (
  userId: string,
  signatureId: string,
  body: UpdateMySignatureBody,
): Promise<SignatureDocument | null> =>
  Signature.findOneAndUpdate(
    { _id: signatureId, userId },
    { $set: body },
    { new: true },
  );

export const deleteSignatureByUserAndId = (
  userId: string,
  signatureId: string,
): Promise<SignatureDocument | null> => Signature.findOneAndDelete({ _id: signatureId, userId });

export const clearDefaultSignatures = (userId: string): Promise<UpdateWriteOpResult> =>
  Signature.updateMany({ userId }, { isDefault: false });
