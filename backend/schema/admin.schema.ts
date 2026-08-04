import { z } from 'zod';
import { objectIdSchema } from './common.schema';

export const updateUserRoleBodySchema = z.object({
  role: z.enum(['user', 'admin']),
}).strict();

export const updateUserActiveBodySchema = z.object({
  isActive: z.boolean(),
}).strict();

export const userParamsSchema = z.object({
  id: objectIdSchema,
});

export const listUsersQuerySchema = z.object({
  search: z.string().optional(),
});

export type UpdateUserRoleBody = z.infer<typeof updateUserRoleBodySchema>;
export type UpdateUserActiveBody = z.infer<typeof updateUserActiveBodySchema>;
export type UserParams = z.infer<typeof userParamsSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
