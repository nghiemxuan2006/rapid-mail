import Campaign, { CampaignDocument } from '../models/campaign.model';

export const findCampaignById = (id: string): Promise<CampaignDocument | null> =>
  Campaign.findById(id);

export const findCampaignsByUserId = (userId: string): Promise<CampaignDocument[]> =>
  Campaign.find({ user_id: userId })
    .select('name status recipients createdAt')
    .sort({ createdAt: -1 });

export const findCampaignsByUserIdFull = (userId: string): Promise<CampaignDocument[]> =>
  Campaign.find({ user_id: userId });

export const updateCampaignById = (
  id: string,
  update: Record<string, unknown>,
): Promise<CampaignDocument | null> => Campaign.findByIdAndUpdate(id, update, { new: true });

export const deleteCampaignById = (id: string): Promise<CampaignDocument | null> =>
  Campaign.findByIdAndDelete(id);

export const saveCampaign = (campaign: CampaignDocument): Promise<CampaignDocument> =>
  campaign.save();
