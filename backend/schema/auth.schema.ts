import { z } from 'zod';

// ===== Request Schemas =====
export const loginQuerySchema = z.object({
  authorize_code: z.string().min(1, 'authorize_code is required'),
});

export const refreshTokenBodySchema = z.object({
  refresh_token: z.string().min(1, 'refresh_token is required'),
});

// ===== Types =====
export type LoginQuery = z.infer<typeof loginQuerySchema>;
export type RefreshTokenBody = z.infer<typeof refreshTokenBodySchema>;