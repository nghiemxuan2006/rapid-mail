import { z } from 'zod';

export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');

// Recipient schema uses .catchall(z.string()) to allow dynamic mail-merge fields
// (e.g., FirstName, Company) that are used for email template personalization like [FirstName]
export const recipientSchema = z.object({
  id: z.string(),
  Email: z.email('Invalid email address'),
}).catchall(z.string());

export type Recipient = z.infer<typeof recipientSchema>;
