import { z } from 'zod';

export const MutipleEmailsPostRequestSchema = z.object({
    content: z.string().min(1, 'Content is required'),
    receivers: z.array(z.object({
        Email: z.string().email({ message: 'Invalid email address' })
    }).catchall(z.string())).min(1, 'Receivers must be a non-empty array'),
});

export type MutipleEmailsPostRequestType = z.infer<typeof MutipleEmailsPostRequestSchema>;

export type Recipient = MutipleEmailsPostRequestType['receivers'][number];