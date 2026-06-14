import { Request, Response, NextFunction } from 'express';
import {
  importGmailSignatures,
  importGmailSignaturesByAccount,
  listSignatures,
  getDefaultSignatureForAccount,
  createSignatureForUser,
  updateSignature,
  deleteSignature,
  // legacy
  updateSignatureService,
} from '../services/signature.service';
import { UNAUTHORIZED_ERROR } from '../utils/error';
import User from '../models/user.model';
import {
  UpdateSignatureBody,
  CreateSignatureBody,
  UpdateMySignatureBody,
} from '../schema/signature.schema';

const requireUserId = (req: Request): string => {
  const userId = req.user?.sub as string | undefined;
  if (!userId) throw new UNAUTHORIZED_ERROR('Missing user context');
  return userId;
};

// ─── Import from Gmail API ────────────────────────────────────────────────────

export const importGmailSignaturesHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserId(req);
    const user = await User.findById(userId);
    if (!user) throw new UNAUTHORIZED_ERROR('User not found');

    const sendAsList = await importGmailSignatures(user);
    res.json({ message: 'Gmail signatures fetched', data: sendAsList });
  } catch (error) {
    next(error);
  }
};

export const importGmailSignaturesByAccountHandler = async (
  req: Request<{ accountId: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserId(req);
    const { accountId } = req.params;
    const sendAsList = await importGmailSignaturesByAccount(userId, accountId);
    res.json({ message: 'Gmail signatures fetched', data: sendAsList });
  } catch (error) {
    next(error);
  }
};

// ─── App-managed signatures (MongoDB CRUD) ───────────────────────────────────

export const getDefaultSignatureHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserId(req);
    const accountId = req.query.accountId as string | undefined;
    const signature = await getDefaultSignatureForAccount(userId, accountId);
    res.json({ message: 'Default signature retrieved', data: signature ?? null });
  } catch (error) {
    next(error);
  }
};

export const getSignaturesHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = requireUserId(req);
    const signatures = await listSignatures(userId);
    res.json({ message: 'Signatures retrieved successfully', data: signatures });
  } catch (error) {
    next(error);
  }
};

export const createSignatureHandler = async (
  req: Request<{}, {}, CreateSignatureBody>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserId(req);
    const signature = await createSignatureForUser(userId, req.body);
    res.status(201).json({ message: 'Signature created', data: signature });
  } catch (error) {
    next(error);
  }
};

export const updateSignatureHandler = async (
  req: Request<{ id: string }, {}, UpdateMySignatureBody>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserId(req);
    const signature = await updateSignature(userId, req.params.id, req.body);
    res.json({ message: 'Signature updated', data: signature });
  } catch (error) {
    next(error);
  }
};

export const deleteSignatureHandler = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserId(req);
    await deleteSignature(userId, req.params.id);
    res.json({ message: 'Signature deleted' });
  } catch (error) {
    next(error);
  }
};

// ─── Legacy: update Gmail sendAs signature directly ──────────────────────────

export const getSignatures = getSignaturesHandler;

export const updateSignature_legacy = async (
  req: Request<{}, {}, UpdateSignatureBody>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserId(req);
    const { sendAsEmail, signature } = req.body;
    const result = await updateSignatureService(userId, sendAsEmail, signature);
    res.json({ message: 'Signature updated successfully', data: result });
  } catch (error) {
    next(error);
  }
};
