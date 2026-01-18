import { z } from 'zod';

export const MutipleEmailsPostRequestSchema = z.object({
    content: z.string().min(1, 'Content is required'),
    recipients: z.array(z.object({
        id: z.string(),
        Email: z.string().email({ message: 'Invalid email address' })
    }).catchall(z.string())).min(1, 'Recipients must be a non-empty array'),
});

export type MutipleEmailsPostRequestType = z.infer<typeof MutipleEmailsPostRequestSchema>;

export type Recipient = MutipleEmailsPostRequestType['recipients'][number];