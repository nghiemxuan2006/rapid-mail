import { z } from 'zod';

// ===== Base Entity Schema =====
export const userSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  googleAccessToken: z.string().min(1),
  googleRefreshToken: z.string().min(1),
});

// ===== Types =====
export type User = z.infer<typeof userSchema>;
