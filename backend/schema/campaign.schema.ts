import { z } from 'zod';
import { objectIdSchema, recipientSchema } from './common.schema';

// ===== Base Entity Schema =====
export const campaignSchema = z.object({
  user_id: objectIdSchema,
  name: z.string().min(1, 'Name is required'),
  subject: z.string().min(1, 'Subject is required'),
  content: z.string().min(1, 'Content is required'),
  recipients: z.array(recipientSchema).min(1, 'Recipients must be a non-empty array'),
});

// ===== Request Schemas =====
export const createCampaignBodySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  subject: z.string().min(1, 'Subject is required'),
  content: z.string().min(1, 'Content is required'),
  recipients: z.array(recipientSchema).min(1, 'Recipients must be a non-empty array'),
});

export const updateCampaignBodySchema = z.object({
  name: z.string().min(1).optional(),
  subject: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  recipients: z.array(recipientSchema).min(1).optional(),
});

export const campaignParamsSchema = z.object({
  id: objectIdSchema,
});

// ===== Types =====
export type Campaign = z.infer<typeof campaignSchema>;
export type CreateCampaignBody = z.infer<typeof createCampaignBodySchema>;
export type UpdateCampaignBody = z.infer<typeof updateCampaignBodySchema>;
export type CampaignParams = z.infer<typeof campaignParamsSchema>;
