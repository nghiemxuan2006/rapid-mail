import { z } from 'zod';

export const loginSchema = z.object({
    authorize_code: z.string().min(1, 'authorize_code is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;