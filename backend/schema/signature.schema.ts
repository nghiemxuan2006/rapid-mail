import { z } from 'zod';

// ===== Request Schemas =====
export const updateSignatureBodySchema = z.object({
  sendAsEmail: z.string().email('Invalid email address'),
  signature: z.string().min(1, 'Signature cannot be empty'),
});

// ===== Types =====
export type UpdateSignatureBody = z.infer<typeof updateSignatureBodySchema>;
