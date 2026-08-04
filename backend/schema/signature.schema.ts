import { z } from 'zod';

// ===== Request Schemas =====

export const createSignatureBodySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  content: z.string().default(''),
  sourceEmail: z.string().email().optional(),
  provider: z.enum(['gmail', 'outlook']).optional(),
  isDefault: z.boolean().optional(),
});

export const updateMySignatureBodySchema = z.object({
  name: z.string().min(1).optional(),
  content: z.string().optional(),
  isDefault: z.boolean().optional(),
});

// ===== Types =====
export type CreateSignatureBody = z.infer<typeof createSignatureBodySchema>;
export type UpdateMySignatureBody = z.infer<typeof updateMySignatureBodySchema>;
