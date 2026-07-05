import { z } from 'zod';
import { objectIdSchema } from './common.schema';

export const feedbackTypeEnum = z.enum(['bug', 'feature', 'general']);
export const feedbackStatusEnum = z.enum(['pending', 'in_progress', 'resolved']);

// ===== Base Entity Schema =====
export const feedbackSchema = z.object({
  user_id: objectIdSchema,
  type: feedbackTypeEnum,
  title: z.string().min(1, 'Title is required').max(100, 'Title must be at most 100 characters'),
  message: z.string().min(1, 'Message is required').max(2000, 'Message must be at most 2000 characters'),
  status: feedbackStatusEnum.default('pending'),
});

// ===== Request Schemas =====
export const createFeedbackBodySchema = z.object({
  type: feedbackTypeEnum,
  title: z.string().min(1, 'Title is required').max(100, 'Title must be at most 100 characters'),
  message: z.string().min(1, 'Message is required').max(2000, 'Message must be at most 2000 characters'),
}).strict();

export const updateFeedbackStatusBodySchema = z.object({
  status: feedbackStatusEnum,
}).strict();

export const feedbackParamsSchema = z.object({
  id: objectIdSchema,
});

export const listFeedbackQuerySchema = z.object({
  type: feedbackTypeEnum.optional(),
  status: feedbackStatusEnum.optional(),
});

// ===== Types =====
export type Feedback = z.infer<typeof feedbackSchema>;
export type CreateFeedbackBody = z.infer<typeof createFeedbackBodySchema>;
export type UpdateFeedbackStatusBody = z.infer<typeof updateFeedbackStatusBodySchema>;
export type FeedbackParams = z.infer<typeof feedbackParamsSchema>;
export type ListFeedbackQuery = z.infer<typeof listFeedbackQuerySchema>;
