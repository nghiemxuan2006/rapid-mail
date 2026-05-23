import { z } from 'zod';
import { objectIdSchema } from './common.schema';

export const sendNowBodySchema = z.object({
  sendMode: z.literal('now'),
});

export const sendScheduleAllBodySchema = z.object({
  sendMode: z.literal('schedule_all'),
  scheduledAt: z.string().datetime('scheduledAt must be a valid ISO datetime'),
});

export const sendScheduleIndividualBodySchema = z.object({
  sendMode: z.literal('schedule_individual'),
  scheduledTimes: z.record(z.string(), z.string().datetime()),
});

export const sendCampaignBodySchema = z.discriminatedUnion('sendMode', [
  sendNowBodySchema,
  sendScheduleAllBodySchema,
  sendScheduleIndividualBodySchema,
]);

export const campaignSendParamsSchema = z.object({
  id: objectIdSchema,
});

export type SendCampaignBody = z.infer<typeof sendCampaignBodySchema>;
export type CampaignSendParams = z.infer<typeof campaignSendParamsSchema>;
