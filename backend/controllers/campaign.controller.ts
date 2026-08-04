import { NextFunction, Request, Response } from 'express';
import Campaign from '../models/campaign.model';
import { NOT_FOUND_ERROR } from '../utils/error';
import { CreateCampaignBody, UpdateCampaignBody, CampaignParams } from '../schema/campaign.schema';
import {
  saveFiles,
  deleteFiles,
  deleteSingleFile,
  readCampaignConfig,
} from '../services/file-storage.service';
import { findUserById } from '../repositories/user.repository';
import { findSignatureByEmail } from '../repositories/signature.repository';
import {
  findCampaignById,
  findCampaignsByUserId,
  updateCampaignById,
  deleteCampaignById as deleteCampaignByIdRepo,
  saveCampaign,
} from '../repositories/campaign.repository';

export const createCampaign = async (
  req: Request<{}, {}, CreateCampaignBody>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { name, subject, content, recipients } = req.body;
    const newCampaign = new Campaign({ user_id: req.user.sub, name, subject, content, recipients });
    const savedCampaign = await saveCampaign(newCampaign);

    const files = req.files as Express.Multer.File[] | undefined;
    if (files && files.length > 0) {
      savedCampaign.attachments = await saveFiles(savedCampaign._id.toString(), files);
      await saveCampaign(savedCampaign);
    }

    res.status(201).json({ message: 'Campaign created successfully', data: savedCampaign });
  } catch (error) {
    next(error);
  }
};

export const getAllCampaigns = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const campaigns = await findCampaignsByUserId(req.user.sub);
    res.json({ message: 'Campaigns retrieved successfully', data: campaigns });
  } catch (error) {
    next(error);
  }
};

export const getCampaignById = async (
  req: Request<CampaignParams>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const campaign = await findCampaignById(req.params.id);
    if (!campaign) {
      throw new NOT_FOUND_ERROR('Campaign not found');
    }
    if (campaign.user_id.toString() !== req.user.sub) {
      throw new NOT_FOUND_ERROR('Campaign not found');
    }

    let signature = '';

    if (campaign.status === 'draft') {
      const user = await findUserById(req.user.sub);
      if (user) {
        const activeAccount = user.activeAccountId
          ? (user.connectedAccounts || []).find(
              (acc: any) => acc._id.toString() === String(user.activeAccountId),
            )
          : null;
        const senderEmail = activeAccount?.email || user.email;
        const matchedSignature = await findSignatureByEmail(
          campaign.user_id.toString(),
          senderEmail,
        );
        signature = matchedSignature?.content ?? '';
      }
    } else {
      const config = await readCampaignConfig(campaign._id.toString());
      signature = config?.signature ?? '';
    }

    res.json({
      message: 'Campaign retrieved successfully',
      data: { ...campaign.toObject(), signature },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCampaignById = async (
  req: Request<CampaignParams>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const campaign = await findCampaignById(req.params.id);
    if (!campaign) {
      throw new NOT_FOUND_ERROR('Campaign not found');
    }
    if (campaign.user_id.toString() !== req.user.sub) {
      throw new NOT_FOUND_ERROR('You do not have permission to delete this campaign');
    }
    await deleteFiles(campaign._id.toString());
    await deleteCampaignByIdRepo(req.params.id);
    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const updateCampaign = async (
  req: Request<CampaignParams, {}, UpdateCampaignBody>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const campaign = await findCampaignById(req.params.id);
    if (!campaign) {
      throw new NOT_FOUND_ERROR('Campaign not found');
    }
    if (campaign.user_id.toString() !== req.user.sub) {
      throw new NOT_FOUND_ERROR('You do not have permission to update this campaign');
    }

    const { name, subject, content, recipients } = req.body;
    const updateData: Record<string, unknown> = { name, subject, content, recipients };

    const files = req.files as Express.Multer.File[] | undefined;
    if (files && files.length > 0) {
      const newAttachments = await saveFiles(campaign._id.toString(), files);
      updateData.attachments = [...(campaign.attachments || []), ...newAttachments];
    }

    // Handle removing specific attachments via removeAttachments field
    const removeAttachments = req.body.removeAttachments as string | string[] | undefined;
    if (removeAttachments) {
      const toRemove = Array.isArray(removeAttachments) ? removeAttachments : [removeAttachments];
      const currentAttachments = (updateData.attachments || campaign.attachments || []) as Array<{
        storedName: string;
      }>;
      for (const storedName of toRemove) {
        await deleteSingleFile(campaign._id.toString(), storedName);
      }
      updateData.attachments = currentAttachments.filter((a) => !toRemove.includes(a.storedName));
    }

    const updatedCampaign = await updateCampaignById(req.params.id, updateData);
    res.json({ message: 'Campaign updated successfully', data: updatedCampaign });
  } catch (error) {
    next(error);
  }
};
