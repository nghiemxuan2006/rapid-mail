# Feedback & Admin Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a feedback form (Bug/Feature/General) on the About page for logged-in users, and a new `/admin` page for managing users (role, active status, delete) and feedback (filter, status, delete).

**Architecture:** Follow the existing layered convention (`routers → controllers → repositories → models`, Zod schemas at the boundary). Backend gains a `role`/`isActive` field on `User`, a new `Feedback` model, a `requireAdmin` middleware, and an `/v1/admin/*` route group. Frontend gains a `feedback` feature (API thunk + form on About) and an `admin` feature (API thunks + `AdminPage` with Users/Feedback tabs), gated by `user.role` in Redux.

**Tech Stack:** Express + Mongoose + Zod (backend), React + Redux Toolkit + Yup + shadcn/ui (frontend). No automated test framework is configured in this repo (`npm test` just boots the app against `.env.test`) — verification steps in this plan use `curl` against a running dev server and manual UI checks instead of unit tests.

## Global Constraints

- Follow spec `docs/superpowers/specs/2026-07-05-feedback-and-admin-design.md` exactly — field names, endpoint paths, and status codes below match it verbatim.
- Backend: never throw plain `Error` — always a subclass from `utils/error.ts`. Never read raw `req.body.x` — read from the Zod-parsed object. Response shape is always `{ message, data }` (success) or `{ message }` (error/no-body).
- Backend: all DB queries go through `repositories/`, never through Mongoose models directly in controllers.
- Frontend: validate every form with Yup before submitting. Use only built-in Tailwind classes (no arbitrary `[]` values).
- Title max 100 chars, message max 2000 chars for feedback (per spec).
- Commit after every task.

---

### Task 1: User model — add `role` and `isActive`

**Files:**
- Modify: `backend/schema/user.schema.ts`
- Modify: `backend/models/user.model.ts`

**Interfaces:**
- Produces: `User.role: 'user' | 'admin'` (default `'user'`), `User.isActive: boolean` (default `true`) — used by `require-admin.ts` (Task 5), `verify-token.ts` (Task 6), and `auth.service.getUserProfile` (Task 7).

- [ ] **Step 1: Update the Zod schema**

In `backend/schema/user.schema.ts`, add to `userSchema`:

```ts
export const userSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  googleAccessToken: z.string().min(1),
  googleRefreshToken: z.string().min(1),
  connectedAccounts: z.array(connectedAccountSchema).optional(),
  activeAccountId: z.string().optional().nullable(),
  role: z.enum(['user', 'admin']).default('user'),
  isActive: z.boolean().default(true),
});
```

- [ ] **Step 2: Update the Mongoose model**

In `backend/models/user.model.ts`, add fields to `UserSchema`:

```ts
const UserSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    googleAccessToken: { type: String, required: true },
    googleRefreshToken: { type: String, required: true },
    connectedAccounts: { type: [ConnectedAccountSchema], default: [] },
    activeAccountId: { type: String, default: null },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);
```

- [ ] **Step 3: Verify it compiles**

Run: `cd backend && npx tsc --noEmit`
Expected: no new errors (the two pre-existing errors in `email.service.ts` / `worker/consumer.ts` may still be present — ignore those).

- [ ] **Step 4: Commit**

```bash
cd backend
git add schema/user.schema.ts models/user.model.ts
git commit -m "feat(backend): add role and isActive fields to User"
```

---

### Task 2: Feedback model + schema

**Files:**
- Create: `backend/schema/feedback.schema.ts`
- Create: `backend/models/feedback.model.ts`

**Interfaces:**
- Produces: `FeedbackDocument` type, `createFeedbackBodySchema`, `updateFeedbackStatusBodySchema`, `feedbackParamsSchema`, `listFeedbackQuerySchema` — consumed by `feedback.repository.ts` (Task 3), `feedback.controller.ts` (Task 4), `admin.controller.ts` (Task 9).

- [ ] **Step 1: Write the Zod schema**

Create `backend/schema/feedback.schema.ts`:

```ts
import { z } from 'zod';
import { objectIdSchema } from './common.schema';

export const feedbackTypeEnum = z.enum(['bug', 'feature', 'general']);
export const feedbackStatusEnum = z.enum(['pending', 'in_progress', 'resolved']);

// ===== Base Entity Schema =====
export const feedbackSchema = z.object({
  user_id: objectIdSchema,
  type: feedbackTypeEnum,
  title: z.string().min(1, 'Title is required').max(100, 'Title must be at most 100 characters'),
  message: z.string().min(1, 'Message is required').max(2000, 'Message must be at most 2000 characters'),
  status: feedbackStatusEnum.default('pending'),
});

// ===== Request Schemas =====
export const createFeedbackBodySchema = z.object({
  type: feedbackTypeEnum,
  title: z.string().min(1, 'Title is required').max(100, 'Title must be at most 100 characters'),
  message: z.string().min(1, 'Message is required').max(2000, 'Message must be at most 2000 characters'),
}).strict();

export const updateFeedbackStatusBodySchema = z.object({
  status: feedbackStatusEnum,
}).strict();

export const feedbackParamsSchema = z.object({
  id: objectIdSchema,
});

export const listFeedbackQuerySchema = z.object({
  type: feedbackTypeEnum.optional(),
  status: feedbackStatusEnum.optional(),
});

// ===== Types =====
export type Feedback = z.infer<typeof feedbackSchema>;
export type CreateFeedbackBody = z.infer<typeof createFeedbackBodySchema>;
export type UpdateFeedbackStatusBody = z.infer<typeof updateFeedbackStatusBodySchema>;
export type FeedbackParams = z.infer<typeof feedbackParamsSchema>;
export type ListFeedbackQuery = z.infer<typeof listFeedbackQuerySchema>;
```

Note: check `backend/schema/common.schema.ts` exports `objectIdSchema` (already used by `campaign.schema.ts` — confirmed present).

- [ ] **Step 2: Write the Mongoose model**

Create `backend/models/feedback.model.ts`:

```ts
import mongoose, { Document, Schema } from 'mongoose';
import { Feedback } from '../schema/feedback.schema';

export type FeedbackDocument = Feedback &
  Document & {
    createdAt: Date;
    updatedAt: Date;
  };

const FeedbackSchema = new Schema<FeedbackDocument>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['bug', 'feature', 'general'], required: true },
    title: { type: String, required: true, maxlength: 100 },
    message: { type: String, required: true, maxlength: 2000 },
    status: { type: String, enum: ['pending', 'in_progress', 'resolved'], default: 'pending' },
  },
  { timestamps: true },
);

export default mongoose.model<FeedbackDocument>('Feedback', FeedbackSchema);
```

- [ ] **Step 3: Verify it compiles**

Run: `cd backend && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
cd backend
git add schema/feedback.schema.ts models/feedback.model.ts
git commit -m "feat(backend): add Feedback model and schema"
```

---

### Task 3: Feedback repository

**Files:**
- Create: `backend/repositories/feedback.repository.ts`

**Interfaces:**
- Consumes: `FeedbackDocument` (Task 2)
- Produces: `createFeedback`, `findFeedbackByUserId`, `findAllFeedback`, `updateFeedbackStatusById`, `deleteFeedbackById` — consumed by `feedback.controller.ts` (Task 4) and `admin.controller.ts` (Task 9).

- [ ] **Step 1: Write the repository**

Create `backend/repositories/feedback.repository.ts`:

```ts
import Feedback, { FeedbackDocument } from '../models/feedback.model';

export const createFeedback = (doc: {
  user_id: string;
  type: string;
  title: string;
  message: string;
}) => Feedback.create(doc);

export const findFeedbackByUserId = (userId: string) =>
  Feedback.find({ user_id: userId }).sort({ createdAt: -1 });

export const findAllFeedback = (filter: { type?: string; status?: string }) =>
  Feedback.find(filter).sort({ createdAt: -1 }).populate('user_id', 'name email');

export const findFeedbackById = (id: string) => Feedback.findById(id);

export const updateFeedbackStatusById = (id: string, status: string) =>
  Feedback.findByIdAndUpdate(id, { status }, { new: true });

export const deleteFeedbackById = (id: string): Promise<FeedbackDocument | null> =>
  Feedback.findByIdAndDelete(id);
```

- [ ] **Step 2: Verify it compiles**

Run: `cd backend && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
cd backend
git add repositories/feedback.repository.ts
git commit -m "feat(backend): add feedback repository"
```

---

### Task 4: Feedback controller + router (user-facing)

**Files:**
- Create: `backend/controllers/feedback.controller.ts`
- Create: `backend/routers/feedback.route.ts`
- Modify: `backend/routers/index.ts`

**Interfaces:**
- Consumes: `createFeedback`, `findFeedbackByUserId` (Task 3); `verifyToken` (existing); `createFeedbackBodySchema` (Task 2)
- Produces: mounted route `/v1/feedback` — used by frontend `feedbackApi.tsx` (Task 10)

- [ ] **Step 1: Write the controller**

Create `backend/controllers/feedback.controller.ts`:

```ts
import { NextFunction, Request, Response } from 'express';
import { CreateFeedbackBody } from '../schema/feedback.schema';
import { createFeedback, findFeedbackByUserId } from '../repositories/feedback.repository';

export const submitFeedback = async (
  req: Request<{}, {}, CreateFeedbackBody>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { type, title, message } = req.body;
    const feedback = await createFeedback({ user_id: req.user.sub, type, title, message });
    res.status(201).json({ message: 'Feedback submitted successfully', data: feedback });
  } catch (error) {
    next(error);
  }
};

export const getMyFeedback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const feedback = await findFeedbackByUserId(req.user.sub);
    res.json({ message: 'Feedback retrieved successfully', data: feedback });
  } catch (error) {
    next(error);
  }
};
```

- [ ] **Step 2: Write the router**

Create `backend/routers/feedback.route.ts`:

```ts
import express from 'express';
import { verifyToken } from '../middleware/verify-token';
import { validateRequestBody } from '../middleware/validation';
import { createFeedbackBodySchema } from '../schema/feedback.schema';
import { submitFeedback, getMyFeedback } from '../controllers/feedback.controller';

const router = express.Router();

router.post('/', verifyToken, validateRequestBody(createFeedbackBodySchema), submitFeedback);
router.get('/mine', verifyToken, getMyFeedback);

export default router;
```

- [ ] **Step 3: Mount the router**

In `backend/routers/index.ts`, add the import and mount (restoring the `/email`-style slot with the new feedback router):

```ts
import express from 'express';

import authRoutes from './auth.route';
import campaignRoutes from './campaign.route';
import signatureRoutes from './signature.route';
import replyRoutes from './reply.router';
import pubsubRoutes from './pubsub.router';
import feedbackRoutes from './feedback.route';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/signatures', signatureRoutes);
router.use('/replies', replyRoutes);
router.use('/webhooks', pubsubRoutes);
router.use('/feedback', feedbackRoutes);

export default router;
```

- [ ] **Step 4: Verify manually**

Run: `cd backend && npm run start` (in one terminal), then in another:

```bash
curl -X POST http://localhost:<PORT>/v1/feedback \
  -H "Authorization: Bearer <valid-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"type":"bug","title":"Test bug","message":"Something broke"}'
```

Expected: `201` with `{ "message": "Feedback submitted successfully", "data": { "type": "bug", "title": "Test bug", ... } }`.

```bash
curl http://localhost:<PORT>/v1/feedback/mine -H "Authorization: Bearer <valid-jwt>"
```

Expected: `200` with an array containing the feedback just created.

- [ ] **Step 5: Commit**

```bash
cd backend
git add controllers/feedback.controller.ts routers/feedback.route.ts routers/index.ts
git commit -m "feat(backend): add user-facing feedback endpoints"
```

---

### Task 5: `requireAdmin` middleware

**Files:**
- Create: `backend/middleware/require-admin.ts`

**Interfaces:**
- Consumes: `req.user.sub` (set by `verifyToken`), `findUserById` (`backend/repositories/user.repository.ts`, existing)
- Produces: `requireAdmin` middleware — consumed by `admin.route.ts` (Task 9)

- [ ] **Step 1: Write the middleware**

Create `backend/middleware/require-admin.ts`:

```ts
import { Request, Response, NextFunction } from 'express';
import { FORBIDDEN_ERROR } from '../utils/error';
import { findUserById } from '../repositories/user.repository';

export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await findUserById(req.user.sub);

    if (!user || user.role !== 'admin') {
      throw new FORBIDDEN_ERROR('Admin access required');
    }

    next();
  } catch (error) {
    next(error);
  }
};

export default requireAdmin;
```

- [ ] **Step 2: Verify it compiles**

Run: `cd backend && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
cd backend
git add middleware/require-admin.ts
git commit -m "feat(backend): add requireAdmin middleware"
```

---

### Task 6: Block inactive users in `verify-token`, expose `role` in profile

**Files:**
- Modify: `backend/middleware/verify-token.ts`
- Modify: `backend/services/auth.service.ts`

**Interfaces:**
- Consumes: `findUserById` (existing repository)
- Produces: `req.user` now guaranteed to belong to an active user for every downstream handler; `getUserProfile()` response now includes `role`, `isActive` — consumed by frontend `authSlice`/`App.tsx` (Task 12–13)

- [ ] **Step 1: Update `verify-token.ts` to check `isActive`**

```ts
import { Request, Response, NextFunction } from 'express';
import { extractToken } from '../utils/token';
import { FORBIDDEN_ERROR, UNAUTHORIZED_ERROR } from '../utils/error';
import { verifyAccessToken } from '../services/auth.service';
import { findUserById } from '../repositories/user.repository';

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accessToken =
      extractToken(req.header('Authorization')) || extractToken(req.header('Token'));

    if (!accessToken) {
      throw new UNAUTHORIZED_ERROR('No token provided');
    }

    const decoded = verifyAccessToken(accessToken);

    const user = await findUserById(decoded.sub);
    if (!user) {
      throw new UNAUTHORIZED_ERROR('User not found');
    }
    if (!user.isActive) {
      throw new FORBIDDEN_ERROR('This account has been disabled');
    }

    req.user = decoded;

    next();
  } catch (error) {
    next(error);
  }
};

export default verifyToken;
```

- [ ] **Step 2: Add `role`/`isActive` to `getUserProfile` in `auth.service.ts`**

Find the `getUserProfile` function (around line 181) and update the returned object:

```ts
const getUserProfile = async (userId: string) => {
  if (!userId) throw new UNAUTHORIZED_ERROR('User ID not found in token');

  const user = await findUserById(userId);
  if (!user) throw new UNAUTHORIZED_ERROR('User not found in database');

  return {
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    activeAccountId: user.activeAccountId || null,
    connectedAccounts: (user.connectedAccounts || []).map((acc: any) => ({
      id: acc._id.toString(),
      email: acc.email,
      provider: acc.provider,
    })),
  };
};
```

- [ ] **Step 3: Verify manually**

Run: `cd backend && npm run start`, then:

```bash
curl http://localhost:<PORT>/v1/auth/profile -H "Authorization: Bearer <valid-jwt>"
```

Expected: `200` with `data.role: "user"` and `data.isActive: true` for a normal account.

Then manually set that user's `isActive` to `false` in MongoDB (`db.users.updateOne({email:"..."}, {$set:{isActive:false}})`) and repeat any authenticated request (e.g. `GET /v1/campaigns`):

Expected: `403` with `{ "message": "This account has been disabled" }`. Set `isActive` back to `true` afterward.

- [ ] **Step 4: Commit**

```bash
cd backend
git add middleware/verify-token.ts services/auth.service.ts
git commit -m "feat(backend): block inactive users and expose role in profile"
```

---

### Task 7: Admin schema (users + feedback requests)

**Files:**
- Create: `backend/schema/admin.schema.ts`

**Interfaces:**
- Produces: `updateUserRoleBodySchema`, `updateUserActiveBodySchema`, `userParamsSchema`, `listUsersQuerySchema` — consumed by `admin.controller.ts` and `admin.route.ts` (Task 9). (`feedback` list/status schemas already exist from Task 2.)

- [ ] **Step 1: Write the schema**

Create `backend/schema/admin.schema.ts`:

```ts
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
```

- [ ] **Step 2: Verify it compiles**

Run: `cd backend && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
cd backend
git add schema/admin.schema.ts
git commit -m "feat(backend): add admin request schemas"
```

---

### Task 8: User repository — list/search/update/delete for admin

**Files:**
- Modify: `backend/repositories/user.repository.ts`

**Interfaces:**
- Produces: `findAllUsers`, `deleteUserById` (added to the existing repository; `updateUserById` already exists and is reused for role/active updates) — consumed by `admin.controller.ts` (Task 9)

- [ ] **Step 1: Add functions**

Append to `backend/repositories/user.repository.ts`:

```ts
export const findAllUsers = (search?: string) => {
  const filter = search
    ? {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
      }
    : {};

  return User.find(filter).select('name email role isActive createdAt').sort({ createdAt: -1 });
};

export const deleteUserById = (id: string) => User.findByIdAndDelete(id);
```

- [ ] **Step 2: Verify it compiles**

Run: `cd backend && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
cd backend
git add repositories/user.repository.ts
git commit -m "feat(backend): add findAllUsers and deleteUserById to user repository"
```

---

### Task 9: Admin controller + router

**Files:**
- Create: `backend/controllers/admin.controller.ts`
- Create: `backend/routers/admin.route.ts`
- Modify: `backend/routers/index.ts`

**Interfaces:**
- Consumes: `findAllUsers`, `updateUserById`, `deleteUserById` (Task 8); `findAllFeedback`, `updateFeedbackStatusById`, `deleteFeedbackById`, `findFeedbackById` (Task 3); `requireAdmin` (Task 5); schemas from Tasks 2 & 7
- Produces: mounted route group `/v1/admin/*` — consumed by frontend `adminApi.tsx` (Task 15)

- [ ] **Step 1: Write the controller**

Create `backend/controllers/admin.controller.ts`:

```ts
import { NextFunction, Request, Response } from 'express';
import { BAD_REQUEST_ERROR, NOT_FOUND_ERROR } from '../utils/error';
import { ListUsersQuery, UpdateUserActiveBody, UpdateUserRoleBody, UserParams } from '../schema/admin.schema';
import { ListFeedbackQuery, UpdateFeedbackStatusBody, FeedbackParams } from '../schema/feedback.schema';
import { findAllUsers, updateUserById, deleteUserById, findUserById } from '../repositories/user.repository';
import {
  findAllFeedback,
  findFeedbackById,
  updateFeedbackStatusById,
  deleteFeedbackById,
} from '../repositories/feedback.repository';

// ===== Users =====

export const listUsers = async (
  req: Request<{}, {}, {}, ListUsersQuery>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const users = await findAllUsers(req.query.search);
    res.json({ message: 'Users retrieved successfully', data: users });
  } catch (error) {
    next(error);
  }
};

export const updateUserRole = async (
  req: Request<UserParams, {}, UpdateUserRoleBody>,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (req.params.id === req.user.sub) {
      throw new BAD_REQUEST_ERROR('Bạn không thể tự đổi role của chính mình');
    }

    const user = await updateUserById(req.params.id, { role: req.body.role });
    if (!user) throw new NOT_FOUND_ERROR('User not found');

    res.json({ message: 'User role updated successfully', data: user });
  } catch (error) {
    next(error);
  }
};

export const updateUserActive = async (
  req: Request<UserParams, {}, UpdateUserActiveBody>,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (req.params.id === req.user.sub) {
      throw new BAD_REQUEST_ERROR('Bạn không thể tự khóa tài khoản của chính mình');
    }

    const user = await updateUserById(req.params.id, { isActive: req.body.isActive });
    if (!user) throw new NOT_FOUND_ERROR('User not found');

    res.json({ message: 'User status updated successfully', data: user });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req: Request<UserParams>, res: Response, next: NextFunction) => {
  try {
    if (req.params.id === req.user.sub) {
      throw new BAD_REQUEST_ERROR('Bạn không thể tự xóa tài khoản của chính mình');
    }

    const user = await findUserById(req.params.id);
    if (!user) throw new NOT_FOUND_ERROR('User not found');

    await deleteUserById(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ===== Feedback =====

export const listFeedback = async (
  req: Request<{}, {}, {}, ListFeedbackQuery>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const feedback = await findAllFeedback({ type: req.query.type, status: req.query.status });
    res.json({ message: 'Feedback retrieved successfully', data: feedback });
  } catch (error) {
    next(error);
  }
};

export const updateFeedbackStatus = async (
  req: Request<FeedbackParams, {}, UpdateFeedbackStatusBody>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const feedback = await updateFeedbackStatusById(req.params.id, req.body.status);
    if (!feedback) throw new NOT_FOUND_ERROR('Feedback not found');

    res.json({ message: 'Feedback status updated successfully', data: feedback });
  } catch (error) {
    next(error);
  }
};

export const deleteFeedback = async (req: Request<FeedbackParams>, res: Response, next: NextFunction) => {
  try {
    const feedback = await findFeedbackById(req.params.id);
    if (!feedback) throw new NOT_FOUND_ERROR('Feedback not found');

    await deleteFeedbackById(req.params.id);
    res.json({ message: 'Feedback deleted successfully' });
  } catch (error) {
    next(error);
  }
};
```

- [ ] **Step 2: Write the router**

Create `backend/routers/admin.route.ts`:

```ts
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
```

- [ ] **Step 3: Mount the router**

In `backend/routers/index.ts`:

```ts
import express from 'express';

import authRoutes from './auth.route';
import campaignRoutes from './campaign.route';
import signatureRoutes from './signature.route';
import replyRoutes from './reply.router';
import pubsubRoutes from './pubsub.router';
import feedbackRoutes from './feedback.route';
import adminRoutes from './admin.route';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/signatures', signatureRoutes);
router.use('/replies', replyRoutes);
router.use('/webhooks', pubsubRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/admin', adminRoutes);

export default router;
```

- [ ] **Step 4: Verify manually**

Manually set one test user's `role` to `admin` in MongoDB, then with that user's JWT:

```bash
curl http://localhost:<PORT>/v1/admin/users -H "Authorization: Bearer <admin-jwt>"
```
Expected: `200` with list of users including `role`/`isActive`/no password-equivalent fields.

```bash
curl http://localhost:<PORT>/v1/admin/feedback -H "Authorization: Bearer <admin-jwt>"
```
Expected: `200` with the feedback created in Task 4's verification, `user_id` populated with `name`/`email`.

With a non-admin JWT:
```bash
curl http://localhost:<PORT>/v1/admin/users -H "Authorization: Bearer <regular-jwt>"
```
Expected: `403` with `{ "message": "Admin access required" }`.

Self-role-change guard:
```bash
curl -X PATCH http://localhost:<PORT>/v1/admin/users/<admin-own-id>/role \
  -H "Authorization: Bearer <admin-jwt>" -H "Content-Type: application/json" -d '{"role":"user"}'
```
Expected: `400` with the self-change message.

- [ ] **Step 5: Commit**

```bash
cd backend
git add controllers/admin.controller.ts routers/admin.route.ts routers/index.ts
git commit -m "feat(backend): add admin endpoints for managing users and feedback"
```

---

### Task 10: Seed script for first admin account

**Files:**
- Create: `backend/scripts/seed.ts`
- Modify: `backend/package.json`

**Interfaces:**
- Consumes: `User` model (Task 1), MongoDB connection helper (check `backend/config/` for the existing `connectDB`-style function and reuse it)

- [ ] **Step 1: Find the existing DB connection helper**

Run: `cd backend && grep -rl "mongoose.connect" config/`

Read whatever file this reveals to get the exact exported function name and import path before writing Step 2 (do not guess the name).

- [ ] **Step 2: Write the seed script**

Create `backend/scripts/seed.ts` (adjust the `connectDB` import to match what Step 1 found):

```ts
import 'dotenv/config';
import readline from 'readline/promises';
import { connectDB } from '../config/db'; // adjust path/name per Step 1 findings
import User from '../models/user.model';

async function promptCredentials(): Promise<{ email: string; name: string }> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const email = await rl.question('Admin email (must be an existing user, e.g. one who already logged in via Google): ');
    const name = await rl.question('Admin display name (leave blank to keep existing): ');
    return { email: email.trim(), name: name.trim() };
  } finally {
    rl.close();
  }
}

async function main() {
  await connectDB();

  const existingAdmin = await User.findOne({ role: 'admin' });
  if (existingAdmin) {
    console.log(`Admin already exists: ${existingAdmin.email}`);
    process.exit(0);
  }

  const { email, name } = await promptCredentials();
  const user = await User.findOne({ email });

  if (!user) {
    console.error(`No user found with email "${email}". The user must sign in via Google OAuth at least once before being promoted to admin.`);
    process.exit(1);
  }

  user.role = 'admin';
  if (name) user.name = name;
  await user.save();

  console.log(`Promoted "${user.email}" to admin.`);
  process.exit(0);
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
```

Note: since auth is Google-OAuth-only (no password field on `User`), the script promotes an *existing* user (one who already signed in at least once) to admin rather than creating credentials from scratch — reflects the real auth model instead of inventing a password field that doesn't exist.

- [ ] **Step 3: Add the npm script**

In `backend/package.json`, add to `"scripts"`:

```json
"seed": "tsx -r dotenv/config scripts/seed.ts dotenv_config_path=.env"
```

- [ ] **Step 4: Verify manually**

Run: `cd backend && npm run seed`
Expected: prompts for email; if run against a user who has already logged in once via the app, prints `Promoted "<email>" to admin.` Verify in MongoDB that the user's `role` is now `"admin"`. Running it again prints `Admin already exists: <email>`.

- [ ] **Step 5: Commit**

```bash
cd backend
git add scripts/seed.ts package.json
git commit -m "feat(backend): add seed script to promote first admin"
```

---

### Task 11: Frontend — feedback Yup schema + API thunk

**Files:**
- Create: `frontend/src/schema/feedback.ts`
- Create: `frontend/src/features/feedback/feedbackApi.tsx`

**Interfaces:**
- Produces: `feedbackFormSchema` (Yup), `FeedbackType`, `createFeedbackApi` thunk — consumed by `About.tsx` (Task 12)

- [ ] **Step 1: Write the Yup schema**

Create `frontend/src/schema/feedback.ts`:

```ts
import * as yup from 'yup';

export type FeedbackType = 'bug' | 'feature' | 'general';

export interface FeedbackCreateInput {
  type: FeedbackType;
  title: string;
  message: string;
}

export const feedbackFormSchema: yup.ObjectSchema<FeedbackCreateInput> = yup.object({
  type: yup.mixed<FeedbackType>().oneOf(['bug', 'feature', 'general']).required('Vui lòng chọn loại feedback'),
  title: yup.string().trim().min(1, 'Tiêu đề không được để trống').max(100, 'Tiêu đề tối đa 100 ký tự').required('Tiêu đề không được để trống'),
  message: yup.string().trim().min(1, 'Nội dung không được để trống').max(2000, 'Nội dung tối đa 2000 ký tự').required('Nội dung không được để trống'),
});
```

- [ ] **Step 2: Write the API thunk**

Create `frontend/src/features/feedback/feedbackApi.tsx`:

```tsx
import { createAsyncThunk } from '@reduxjs/toolkit'
import { sendRequest } from '@/utils'
import type { FeedbackCreateInput } from '@/schema/feedback'

export interface Feedback {
    _id: string
    type: 'bug' | 'feature' | 'general'
    title: string
    message: string
    status: 'pending' | 'in_progress' | 'resolved'
    createdAt: string
}

export const createFeedbackApi = createAsyncThunk<Feedback, FeedbackCreateInput>(
    'api/create-feedback',
    async (payload, thunkApi) => {
        const res = await sendRequest('feedback', 'POST', payload, thunkApi)
        return res.data
    }
)
```

- [ ] **Step 3: Verify it compiles**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
cd frontend
git add src/schema/feedback.ts src/features/feedback/feedbackApi.tsx
git commit -m "feat(frontend): add feedback Yup schema and API thunk"
```

---

### Task 12: Frontend — feedback form on About page

**Files:**
- Modify: `frontend/src/pages/about/About.tsx`

**Interfaces:**
- Consumes: `feedbackFormSchema`, `FeedbackCreateInput` (Task 11), `createFeedbackApi` (Task 11), `useAppDispatch` (`@/app/hook`, existing), `toast` (`react-toastify`, already imported in `About.tsx`)

- [ ] **Step 1: Read the current `About.tsx` in full to find where to insert the section**

Run: `Read frontend/src/pages/about/About.tsx` and locate the closing of the features grid / before the final closing tags — insert the feedback form as a new section rendered directly above the closing wrapper `</div>` of the page (do not touch the existing marketing content above it).

- [ ] **Step 2: Add local state + submit handler**

Near the top of the `About` component (after existing `useState` calls), add:

```tsx
import { useAppDispatch } from '@/app/hook';
import { createFeedbackApi } from '@/features/feedback/feedbackApi';
import { feedbackFormSchema, type FeedbackCreateInput, type FeedbackType } from '@/schema/feedback';

// inside the component:
const dispatch = useAppDispatch();
const [feedbackType, setFeedbackType] = useState<FeedbackType>('general');
const [feedbackTitle, setFeedbackTitle] = useState('');
const [feedbackMessage, setFeedbackMessage] = useState('');
const [submittingFeedback, setSubmittingFeedback] = useState(false);

const handleSubmitFeedback = async () => {
  const payload: FeedbackCreateInput = {
    type: feedbackType,
    title: feedbackTitle,
    message: feedbackMessage,
  };

  try {
    await feedbackFormSchema.validate(payload, { abortEarly: true });
  } catch (err) {
    if (err instanceof Error) toast.error(err.message);
    return;
  }

  setSubmittingFeedback(true);
  try {
    await dispatch(createFeedbackApi(payload)).unwrap();
    toast.success('Cảm ơn bạn đã gửi feedback!');
    setFeedbackTitle('');
    setFeedbackMessage('');
    setFeedbackType('general');
  } catch {
    toast.error('Gửi feedback thất bại, vui lòng thử lại.');
  } finally {
    setSubmittingFeedback(false);
  }
};
```

- [ ] **Step 3: Add the form JSX**

Insert this section using the existing imported `Card`/`Select`/`Input`/`Textarea`/`Button`/`Label` components (already imported at the top of `About.tsx`):

```tsx
<Card className="mt-8">
  <CardHeader>
    <CardTitle>Gửi Feedback</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    <div className="space-y-2">
      <Label>Loại feedback</Label>
      <Select value={feedbackType} onValueChange={(v) => setFeedbackType(v as FeedbackType)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="bug">Báo lỗi (Bug Report)</SelectItem>
          <SelectItem value="feature">Đề xuất tính năng (Feature Request)</SelectItem>
          <SelectItem value="general">Góp ý chung (General Feedback)</SelectItem>
        </SelectContent>
      </Select>
    </div>
    <div className="space-y-2">
      <Label>Tiêu đề</Label>
      <Input
        value={feedbackTitle}
        onChange={(e) => setFeedbackTitle(e.target.value)}
        maxLength={100}
        placeholder="Tóm tắt ngắn gọn"
      />
    </div>
    <div className="space-y-2">
      <Label>Nội dung</Label>
      <Textarea
        value={feedbackMessage}
        onChange={(e) => setFeedbackMessage(e.target.value)}
        maxLength={2000}
        rows={5}
        placeholder="Mô tả chi tiết..."
      />
    </div>
    <Button onClick={handleSubmitFeedback} disabled={submittingFeedback}>
      {submittingFeedback ? 'Đang gửi...' : 'Gửi feedback'}
    </Button>
  </CardContent>
</Card>
```

- [ ] **Step 4: Verify in the browser**

Run: `cd frontend && npm run dev`, log in, navigate to `/about`, fill the form, submit.
Expected: success toast, form clears, and `GET /v1/feedback/mine` (via curl with your JWT) shows the new entry.

Also verify validation: submit with an empty title.
Expected: error toast "Tiêu đề không được để trống", no network request sent.

- [ ] **Step 5: Commit**

```bash
cd frontend
git add src/pages/about/About.tsx
git commit -m "feat(frontend): add feedback form to About page"
```

---

### Task 13: Frontend — `role`/`isActive` in auth state, fetch profile on load

**Files:**
- Modify: `frontend/src/features/auth/authSlice.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Produces: `state.auth.user.role: 'user' | 'admin' | undefined`, `state.auth.user.isActive: boolean | undefined` — consumed by the `/admin` route guard and `Header.tsx` (Task 14)
- Consumes: `getUserProfile` thunk (`@/features/user/userApi`, existing, now returns `role`/`isActive` per Task 6)

- [ ] **Step 1: Extend `AuthState` and `setUserProfile`**

In `frontend/src/features/auth/authSlice.tsx`, update the `user` type and the `setUserProfile` reducer:

```tsx
export interface AuthState {
    isAuthenticated: boolean
    user: {
        email?: string
        name?: string
        role?: 'user' | 'admin'
        isActive?: boolean
        connectedAccounts?: ConnectedAccount[]
        activeAccountId?: string | null
    } | null
    loading: boolean
    error: string | null
}
```

```tsx
setUserProfile: (
    state,
    action: PayloadAction<{ email?: string; name?: string; role?: 'user' | 'admin'; isActive?: boolean; connectedAccounts?: ConnectedAccount[]; activeAccountId?: string | null }>
) => {
    if (state.user) {
        state.user.email = action.payload.email ?? state.user.email
        state.user.name = action.payload.name ?? state.user.name
        state.user.role = action.payload.role ?? state.user.role
        state.user.isActive = action.payload.isActive ?? state.user.isActive
        if (action.payload.connectedAccounts !== undefined) {
            state.user.connectedAccounts = action.payload.connectedAccounts
        }
        if (action.payload.activeAccountId !== undefined) {
            state.user.activeAccountId = action.payload.activeAccountId
        }
    } else {
        state.user = {
            email: action.payload.email,
            name: action.payload.name,
            role: action.payload.role,
            isActive: action.payload.isActive,
            connectedAccounts: action.payload.connectedAccounts,
            activeAccountId: action.payload.activeAccountId,
        }
    }
},
```

(Leave every other reducer untouched.)

- [ ] **Step 2: Fetch the profile once on app load when authenticated**

In `frontend/src/App.tsx`, add a `useEffect` in the `App` component that dispatches `getUserProfile` and stores the result via `setUserProfile` when authenticated and `role` isn't loaded yet:

```tsx
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/hook';
import { getUserProfile } from '@/features/user/userApi';
import { setUserProfile } from '@/features/auth/authSlice';

// inside function App() {
const dispatch = useAppDispatch();
const { isAuthenticated, user } = useAppSelector((state) => state.auth);

useEffect(() => {
  if (isAuthenticated && !user?.role) {
    dispatch(getUserProfile())
      .unwrap()
      .then((data) => dispatch(setUserProfile(data)))
      .catch(() => {});
  }
}, [isAuthenticated, user?.role, dispatch]);
```

Place this `useEffect` before the `return (<BrowserRouter>...` statement, keeping `HomeRedirect` and the rest of the file unchanged.

- [ ] **Step 3: Verify it compiles**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: no new errors.

- [ ] **Step 4: Verify in the browser**

Log in, open Redux DevTools (or add a temporary `console.log`), confirm `state.auth.user.role` becomes `"user"` (or `"admin"` for the promoted account) shortly after load.

- [ ] **Step 5: Commit**

```bash
cd frontend
git add src/features/auth/authSlice.tsx src/App.tsx
git commit -m "feat(frontend): load role/isActive into auth state on app start"
```

---

### Task 14: Frontend — `/admin` route guard + Header link

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/layout/Header.tsx`

**Interfaces:**
- Produces: route `/admin` rendering `AdminPage` (Task 16) only for `role === 'admin'`
- Consumes: `state.auth.user.role` (Task 13)

- [ ] **Step 1: Add an `AdminRoute` guard in `App.tsx`**

Add this component next to `HomeRedirect` in `frontend/src/App.tsx`:

```tsx
function AdminRoute({ children }: { children: ReactNode }) {
  const role = useAppSelector((state) => state.auth.user?.role);

  if (role !== 'admin') {
    return <Navigate to="/campaigns" replace />
  }

  return <>{children}</>
}
```

Add `import type { ReactNode } from 'react';` to the top imports if not already present, and `import AdminPage from '@/pages/admin/AdminPage';`.

- [ ] **Step 2: Register the route**

Add before the `/auth/callback` route:

```tsx
<Route
  path="/admin"
  element={
    <ProtectedRoute>
      <AdminRoute>
        <MainLayout><AdminPage /></MainLayout>
      </AdminRoute>
    </ProtectedRoute>
  }
/>
```

- [ ] **Step 3: Add the Header link, admin-only**

In `frontend/src/components/layout/Header.tsx`, add `useAppSelector` import and read the role:

```tsx
import { useAppDispatch, useAppSelector } from '@/app/hook';

// inside Header component:
const role = useAppSelector((state) => state.auth.user?.role);
```

Add the link inside `<nav>`, after the "About us" link:

```tsx
{role === 'admin' && (
  <Link to="/admin" className={navLinkClass('/admin')}>
    Admin
  </Link>
)}
```

- [ ] **Step 4: Verify it compiles**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: fails only because `@/pages/admin/AdminPage` doesn't exist yet (Task 16 creates it) — if that's the only error, proceed; otherwise fix.

- [ ] **Step 5: Commit**

Commit together with Task 16 once `AdminPage` exists (this task's compile will fail standalone otherwise) — skip a separate commit here and continue directly to Task 15.

---

### Task 15: Frontend — admin API thunks

**Files:**
- Create: `frontend/src/features/admin/adminApi.tsx`

**Interfaces:**
- Produces: `getUsersApi`, `updateUserRoleApi`, `updateUserActiveApi`, `deleteUserApi`, `getFeedbackApi`, `updateFeedbackStatusApi`, `deleteFeedbackApi` — consumed by `UsersTab.tsx` / `FeedbackTab.tsx` (Task 16)

- [ ] **Step 1: Write the thunks**

Create `frontend/src/features/admin/adminApi.tsx`:

```tsx
import { createAsyncThunk } from '@reduxjs/toolkit'
import { sendRequest } from '@/utils'

export interface AdminUser {
    _id: string
    name: string
    email: string
    role: 'user' | 'admin'
    isActive: boolean
    createdAt: string
}

export interface AdminFeedback {
    _id: string
    type: 'bug' | 'feature' | 'general'
    title: string
    message: string
    status: 'pending' | 'in_progress' | 'resolved'
    createdAt: string
    user_id: { _id: string; name: string; email: string } | null
}

export const getUsersApi = createAsyncThunk<AdminUser[], { search?: string } | void>(
    'api/admin-get-users',
    async (payload, thunkApi) => {
        const search = payload?.search
        const query = search ? `?search=${encodeURIComponent(search)}` : ''
        const res = await sendRequest(`admin/users${query}`, 'GET', null, thunkApi)
        return res.data
    }
)

export const updateUserRoleApi = createAsyncThunk<AdminUser, { id: string; role: 'user' | 'admin' }>(
    'api/admin-update-user-role',
    async (payload, thunkApi) => {
        const res = await sendRequest(`admin/users/${payload.id}/role`, 'PATCH', { role: payload.role }, thunkApi)
        return res.data
    }
)

export const updateUserActiveApi = createAsyncThunk<AdminUser, { id: string; isActive: boolean }>(
    'api/admin-update-user-active',
    async (payload, thunkApi) => {
        const res = await sendRequest(`admin/users/${payload.id}/active`, 'PATCH', { isActive: payload.isActive }, thunkApi)
        return res.data
    }
)

export const deleteUserApi = createAsyncThunk<void, { id: string }>(
    'api/admin-delete-user',
    async (payload, thunkApi) => {
        const res = await sendRequest(`admin/users/${payload.id}`, 'DELETE', null, thunkApi)
        return res.data
    }
)

export const getFeedbackApi = createAsyncThunk<AdminFeedback[], { type?: string; status?: string } | void>(
    'api/admin-get-feedback',
    async (payload, thunkApi) => {
        const params = new URLSearchParams()
        if (payload?.type) params.set('type', payload.type)
        if (payload?.status) params.set('status', payload.status)
        const query = params.toString() ? `?${params.toString()}` : ''
        const res = await sendRequest(`admin/feedback${query}`, 'GET', null, thunkApi)
        return res.data
    }
)

export const updateFeedbackStatusApi = createAsyncThunk<AdminFeedback, { id: string; status: 'pending' | 'in_progress' | 'resolved' }>(
    'api/admin-update-feedback-status',
    async (payload, thunkApi) => {
        const res = await sendRequest(`admin/feedback/${payload.id}/status`, 'PATCH', { status: payload.status }, thunkApi)
        return res.data
    }
)

export const deleteFeedbackApi = createAsyncThunk<void, { id: string }>(
    'api/admin-delete-feedback',
    async (payload, thunkApi) => {
        const res = await sendRequest(`admin/feedback/${payload.id}`, 'DELETE', null, thunkApi)
        return res.data
    }
)
```

- [ ] **Step 2: Verify it compiles**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: same single expected error as end of Task 14 (`AdminPage` missing) — no new ones.

- [ ] **Step 3: Commit**

```bash
cd frontend
git add src/features/admin/adminApi.tsx
git commit -m "feat(frontend): add admin API thunks"
```

---

### Task 16: Frontend — `AdminPage` with Users and Feedback tabs

**Files:**
- Create: `frontend/src/pages/admin/AdminPage.tsx`
- Create: `frontend/src/pages/admin/UsersTab.tsx`
- Create: `frontend/src/pages/admin/FeedbackTab.tsx`

**Interfaces:**
- Consumes: `getUsersApi`, `updateUserRoleApi`, `updateUserActiveApi`, `deleteUserApi`, `getFeedbackApi`, `updateFeedbackStatusApi`, `deleteFeedbackApi` (Task 15); `ConfirmModal` (`@/components/ConfirmModal`, existing); `useAppDispatch` (`@/app/hook`); shadcn `Table`/`Select`/`Input`/`Button`/`Badge` (existing in `@/components/ui/`)
- Produces: `AdminPage` default export — consumed by `App.tsx` (Task 14)

- [ ] **Step 1: Write `UsersTab.tsx`**

Create `frontend/src/pages/admin/UsersTab.tsx`:

```tsx
import { useEffect, useState, useCallback } from 'react';
import { useAppDispatch } from '@/app/hook';
import {
  getUsersApi,
  updateUserRoleApi,
  updateUserActiveApi,
  deleteUserApi,
  type AdminUser,
} from '@/features/admin/adminApi';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import ConfirmModal from '@/components/ConfirmModal';
import { toast } from 'sonner';

export function UsersTab() {
  const dispatch = useAppDispatch();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const loadUsers = useCallback(async (searchValue?: string) => {
    setLoading(true);
    try {
      const data = await dispatch(getUsersApi({ search: searchValue })).unwrap();
      setUsers(data);
    } catch {
      toast.error('Không tải được danh sách user');
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleToggleRole = async (user: AdminUser) => {
    const nextRole = user.role === 'admin' ? 'user' : 'admin';
    try {
      await dispatch(updateUserRoleApi({ id: user._id, role: nextRole })).unwrap();
      toast.success('Đã cập nhật role');
      loadUsers(search);
    } catch {
      toast.error('Không thể đổi role (có thể bạn đang thao tác trên chính tài khoản của mình)');
    }
  };

  const handleToggleActive = async (user: AdminUser) => {
    try {
      await dispatch(updateUserActiveApi({ id: user._id, isActive: !user.isActive })).unwrap();
      toast.success(user.isActive ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản');
      loadUsers(search);
    } catch {
      toast.error('Không thể cập nhật trạng thái (có thể bạn đang thao tác trên chính tài khoản của mình)');
    }
  };

  const handleDelete = async () => {
    if (!pendingDeleteId) return;
    try {
      await dispatch(deleteUserApi({ id: pendingDeleteId })).unwrap();
      toast.success('Đã xóa user');
      loadUsers(search);
    } catch {
      toast.error('Không thể xóa user');
    } finally {
      setPendingDeleteId(null);
    }
  };

  return (
    <div className="space-y-4">
      <Input
        placeholder="Tìm theo tên hoặc email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') loadUsers(search); }}
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tên</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Hành động</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user._id}>
              <TableCell>{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>{user.role}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={user.isActive ? 'default' : 'destructive'}>
                  {user.isActive ? 'Active' : 'Disabled'}
                </Badge>
              </TableCell>
              <TableCell className="space-x-2">
                <Button size="sm" variant="outline" onClick={() => handleToggleRole(user)}>
                  {user.role === 'admin' ? 'Hạ quyền' : 'Cấp admin'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleToggleActive(user)}>
                  {user.isActive ? 'Khóa' : 'Mở khóa'}
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setPendingDeleteId(user._id)}>
                  Xóa
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {!loading && users.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                Không có user nào
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <ConfirmModal
        isOpen={pendingDeleteId !== null}
        title="Xóa user"
        message="Bạn có chắc muốn xóa user này? Hành động này không thể hoàn tác."
        onConfirm={handleDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
```

- [ ] **Step 2: Write `FeedbackTab.tsx`**

Create `frontend/src/pages/admin/FeedbackTab.tsx`:

```tsx
import { useEffect, useState, useCallback } from 'react';
import { useAppDispatch } from '@/app/hook';
import {
  getFeedbackApi,
  updateFeedbackStatusApi,
  deleteFeedbackApi,
  type AdminFeedback,
} from '@/features/admin/adminApi';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ConfirmModal from '@/components/ConfirmModal';
import { toast } from 'sonner';

type StatusFilter = 'all' | 'pending' | 'in_progress' | 'resolved';
type TypeFilter = 'all' | 'bug' | 'feature' | 'general';

export function FeedbackTab() {
  const dispatch = useAppDispatch();
  const [items, setItems] = useState<AdminFeedback[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [loading, setLoading] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dispatch(getFeedbackApi({
        type: typeFilter === 'all' ? undefined : typeFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
      })).unwrap();
      setItems(data);
    } catch {
      toast.error('Không tải được danh sách feedback');
    } finally {
      setLoading(false);
    }
  }, [dispatch, typeFilter, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStatusChange = async (id: string, status: AdminFeedback['status']) => {
    try {
      await dispatch(updateFeedbackStatusApi({ id, status })).unwrap();
      toast.success('Đã cập nhật trạng thái');
      load();
    } catch {
      toast.error('Không thể cập nhật trạng thái');
    }
  };

  const handleDelete = async () => {
    if (!pendingDeleteId) return;
    try {
      await dispatch(deleteFeedbackApi({ id: pendingDeleteId })).unwrap();
      toast.success('Đã xóa feedback');
      load();
    } catch {
      toast.error('Không thể xóa feedback');
    } finally {
      setPendingDeleteId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả loại</SelectItem>
            <SelectItem value="bug">Bug Report</SelectItem>
            <SelectItem value="feature">Feature Request</SelectItem>
            <SelectItem value="general">General Feedback</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Loại</TableHead>
            <TableHead>Tiêu đề</TableHead>
            <TableHead>Người gửi</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Hành động</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item._id}>
              <TableCell><Badge variant="secondary">{item.type}</Badge></TableCell>
              <TableCell>
                <div className="font-medium">{item.title}</div>
                <div className="text-sm text-muted-foreground line-clamp-1">{item.message}</div>
              </TableCell>
              <TableCell>{item.user_id?.email ?? '—'}</TableCell>
              <TableCell>
                <Select value={item.status} onValueChange={(v) => handleStatusChange(item._id, v as AdminFeedback['status'])}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Button size="sm" variant="destructive" onClick={() => setPendingDeleteId(item._id)}>
                  Xóa
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {!loading && items.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                Không có feedback nào
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <ConfirmModal
        isOpen={pendingDeleteId !== null}
        title="Xóa feedback"
        message="Bạn có chắc muốn xóa feedback này?"
        onConfirm={handleDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
```

- [ ] **Step 3: Write `AdminPage.tsx`**

Create `frontend/src/pages/admin/AdminPage.tsx`:

```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UsersTab } from './UsersTab';
import { FeedbackTab } from './FeedbackTab';

type Tab = 'users' | 'feedback';

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('users');

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Admin</h1>
      <div className="mb-6 flex gap-2 border-b">
        <Button
          variant="ghost"
          className={tab === 'users' ? 'border-b-2 border-primary rounded-none' : 'rounded-none'}
          onClick={() => setTab('users')}
        >
          Users
        </Button>
        <Button
          variant="ghost"
          className={tab === 'feedback' ? 'border-b-2 border-primary rounded-none' : 'rounded-none'}
          onClick={() => setTab('feedback')}
        >
          Feedback
        </Button>
      </div>
      {tab === 'users' ? <UsersTab /> : <FeedbackTab />}
    </div>
  );
}
```

Check `ConfirmModal`'s actual export style before this step (`frontend/src/components/ConfirmModal/index.tsx`) — import it as `import ConfirmModal from '@/components/ConfirmModal'` only if that's what the barrel file exports; adjust to a named import if not.

- [ ] **Step 4: Verify it compiles**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: no errors (this resolves the outstanding error from Tasks 14/15).

- [ ] **Step 5: Verify in the browser**

Promote a test account to admin via `npm run seed` (Task 10), log in as that account, confirm the "Admin" link appears in the header, navigate to `/admin`, confirm both tabs load data, test: search a user, toggle a role, toggle active status, delete a feedback entry (confirm modal appears), change a feedback status.

Log in as a non-admin account, confirm the "Admin" link is absent and navigating to `/admin` directly redirects to `/campaigns`.

- [ ] **Step 6: Commit**

```bash
cd frontend
git add src/pages/admin/AdminPage.tsx src/pages/admin/UsersTab.tsx src/pages/admin/FeedbackTab.tsx src/App.tsx src/components/layout/Header.tsx
git commit -m "feat(frontend): add admin page with users and feedback management"
```

---

## Self-Review Notes

- Spec coverage: User role/isActive (Task 1), Feedback model (Task 2), all 8 API endpoints (Tasks 4, 9), requireAdmin + isActive blocking (Tasks 5–6), seed approach adapted to Google-OAuth-only auth (Task 10, spec's password-based description corrected to match actual auth model), feedback form on About (Task 12), Admin page with both tabs (Task 16), self-action guards (Task 9), hard-delete feedback (Task 9), no-cascade on user delete (Task 9 — feedback rows keep their `user_id`, no cleanup step added, matching spec's explicit choice).
- No automated tests exist in this repo — every task substitutes a concrete manual verification (curl or browser steps) for the "run tests" step the skill template expects.
- Task 14 intentionally leaves `AdminPage` unresolved until Task 16 — noted inline so the executor doesn't treat the interim compile error as a regression.
