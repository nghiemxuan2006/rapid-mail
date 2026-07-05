import express from 'express';
import { verifyToken } from '../middleware/verify-token';
import { requireAdmin } from '../middleware/require-admin';
import { validateRequestBody, validateRequestParams, validateRequestQuery } from '../middleware/validation';
import {
  updateUserRoleBodySchema,
  updateUserActiveBodySchema,
  userParamsSchema,
  listUsersQuerySchema,
} from '../schema/admin.schema';
import { listFeedbackQuerySchema, updateFeedbackStatusBodySchema, feedbackParamsSchema } from '../schema/feedback.schema';
import {
  listUsers,
  updateUserRole,
  updateUserActive,
  deleteUser,
  listFeedback,
  updateFeedbackStatus,
  deleteFeedback,
} from '../controllers/admin.controller';

const router = express.Router();

router.use(verifyToken, requireAdmin);

router.get('/users', validateRequestQuery(listUsersQuerySchema), listUsers);
router.patch('/users/:id/role', validateRequestParams(userParamsSchema), validateRequestBody(updateUserRoleBodySchema), updateUserRole);
router.patch('/users/:id/active', validateRequestParams(userParamsSchema), validateRequestBody(updateUserActiveBodySchema), updateUserActive);
router.delete('/users/:id', validateRequestParams(userParamsSchema), deleteUser);

router.get('/feedback', validateRequestQuery(listFeedbackQuerySchema), listFeedback);
router.patch('/feedback/:id/status', validateRequestParams(feedbackParamsSchema), validateRequestBody(updateFeedbackStatusBodySchema), updateFeedbackStatus);
router.delete('/feedback/:id', validateRequestParams(feedbackParamsSchema), deleteFeedback);

export default router;
