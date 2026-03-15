import { z } from 'zod';
import { recipientSchema } from './common.schema';

// ===== Request Schemas =====
export const multipleEmailsBodySchema = z.object({
  content: z.string().min(1, 'Content is required'),
  recipients: z.array(recipientSchema).min(1, 'Recipients must be a non-empty array'),
  subject: z.string().min(1, 'Subject is required'),
});

// ===== Types =====
export type MultipleEmailsBody = z.infer<typeof multipleEmailsBodySchema>;
