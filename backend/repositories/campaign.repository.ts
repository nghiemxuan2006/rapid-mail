import Campaign, { CampaignDocument } from '../models/campaign.model';

export const findCampaignById = (id: string) =>
  Campaign.findById(id);

export const findCampaignsByUserId = (userId: string) =>
  Campaign.find({ user_id: userId })
    .select('name status recipients createdAt')
    .sort({ createdAt: -1 });

export const findCampaignsByUserIdFull = (userId: string) =>
  Campaign.find({ user_id: userId });

export const updateCampaignById = (
  id: string,
  update: Record<string, unknown>,
) =>
  Campaign.findByIdAndUpdate(id, update, { new: true });

export const deleteCampaignById = (id: string) =>
  Campaign.findByIdAndDelete(id);

export const saveCampaign = (campaign: CampaignDocument) => campaign.save();
