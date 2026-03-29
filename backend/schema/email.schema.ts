import { z } from 'zod';
import { objectIdSchema } from './common.schema';

// ===== Request Schemas =====
export const sendCampaignEmailsSchema = z.object({
  campaignId: objectIdSchema,
});

// ===== Types =====
export type SendCampaignEmailsBody = z.infer<typeof sendCampaignEmailsSchema>;
