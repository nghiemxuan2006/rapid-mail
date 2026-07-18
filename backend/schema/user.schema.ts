import { z } from 'zod';

export const connectedAccountSchema = z.object({
  email: z.string().email(),
  provider: z.enum(['gmail', 'outlook']),
  accessToken: z.string().min(1),
  refreshToken: z.string().optional(),
});

// ===== Base Entity Schema =====
export const userSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  connectedAccounts: z.array(connectedAccountSchema).optional(),
  activeAccountId: z.string().optional().nullable(),
  role: z.enum(['user', 'admin']).default('user'),
  isActive: z.boolean().default(true),
});

// ===== Types =====
export type ConnectedAccount = z.infer<typeof connectedAccountSchema>;
export type User = z.infer<typeof userSchema>;
