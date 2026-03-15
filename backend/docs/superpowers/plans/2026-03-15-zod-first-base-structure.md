# Zod-First MVC Base Structure Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the rapid-mail backend so Zod is the single source of truth for entity definitions, request validation, and TypeScript types, with thin Mongoose models for persistence.

**Architecture:** MVC structure preserved. Each entity gets one schema file (base Zod schema + request schemas + inferred types). Models import types from schema. Validation middleware on every route. Controllers use typed Request generics.

**Tech Stack:** Zod, Mongoose, Express, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-15-zod-mongoose-base-structure-design.md`

**Notes:**
- `Recipient` type is exported from `schema/common.schema.ts` (not `campaign.schema.ts` as in the spec example) since it is shared across campaign and email entities.
- Services use `UserDocument` from `models/user.model.ts` (not `User` from `schema/user.schema.ts`) because services interact with Mongoose documents that have methods like `save()`, `_id`, etc.

---

## Chunk 1: Foundation (common schema + validation middleware)

### Task 1: Create `schema/common.schema.ts`

**Files:**
- Create: `schema/common.schema.ts`

- [ ] **Step 1: Create the common schema file**

```ts
import { z } from 'zod';

export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');

// Recipient schema uses .catchall(z.string()) to allow dynamic mail-merge fields
// (e.g., FirstName, Company) that are used for email template personalization like [FirstName]
export const recipientSchema = z.object({
  id: z.string(),
  Email: z.string().email('Invalid email address'),
}).catchall(z.string());

export type Recipient = z.infer<typeof recipientSchema>;
```

- [ ] **Step 2: Commit**

```bash
git add schema/common.schema.ts
git commit -m "feat: add common schema with objectId and recipient primitives"
```

---

### Task 2: Update `middleware/validation.ts` to write parsed data back

**Files:**
- Modify: `middleware/validation.ts:11`

- [ ] **Step 1: Update the validate function**

Change line 11 from:
```ts
      await schema.parseAsync(req[source]);
```
to:
```ts
      req[source] = await schema.parseAsync(req[source]);
```

This ensures Zod's parsed/transformed output is what the controller receives.

- [ ] **Step 2: Commit**

```bash
git add middleware/validation.ts
git commit -m "fix: validation middleware writes parsed data back to req"
```

---

## Chunk 2: All schema files + models (create before consumers)

### Task 3: Create `schema/user.schema.ts`

**Files:**
- Create: `schema/user.schema.ts`

- [ ] **Step 1: Create the user schema file**

```ts
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
```

- [ ] **Step 2: Commit**

```bash
git add schema/user.schema.ts
git commit -m "feat: add user Zod schema as source of truth"
```

---

### Task 4: Create `schema/campaign.schema.ts`

**Files:**
- Create: `schema/campaign.schema.ts`

- [ ] **Step 1: Create the campaign schema file**

```ts
import { z } from 'zod';
import { objectIdSchema, recipientSchema } from './common.schema';

// ===== Base Entity Schema =====
export const campaignSchema = z.object({
  user_id: objectIdSchema,
  name: z.string().min(1, 'Name is required'),
  subject: z.string().min(1, 'Subject is required'),
  content: z.string().min(1, 'Content is required'),
  recipients: z.array(recipientSchema).min(1, 'Recipients must be a non-empty array'),
});

// ===== Request Schemas =====
export const createCampaignBodySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  subject: z.string().min(1, 'Subject is required'),
  content: z.string().min(1, 'Content is required'),
  recipients: z.array(recipientSchema).min(1, 'Recipients must be a non-empty array'),
});

export const updateCampaignBodySchema = z.object({
  name: z.string().min(1).optional(),
  subject: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  recipients: z.array(recipientSchema).min(1).optional(),
});

export const campaignParamsSchema = z.object({
  id: objectIdSchema,
});

// ===== Types =====
export type Campaign = z.infer<typeof campaignSchema>;
export type CreateCampaignBody = z.infer<typeof createCampaignBodySchema>;
export type UpdateCampaignBody = z.infer<typeof updateCampaignBodySchema>;
export type CampaignParams = z.infer<typeof campaignParamsSchema>;
```

- [ ] **Step 2: Commit**

```bash
git add schema/campaign.schema.ts
git commit -m "feat: add campaign Zod schema with request schemas and types"
```

---

### Task 5: Update `schema/email.schema.ts`

**Files:**
- Modify: `schema/email.schema.ts`

- [ ] **Step 1: Rewrite email schema to use common recipientSchema**

Replace the entire file with:

```ts
import { z } from 'zod';
import { recipientSchema } from './common.schema';

// ===== Request Schemas =====
export const multipleEmailsBodySchema = z.object({
  content: z.string().min(1, 'Content is required'),
  recipients: z.array(recipientSchema).min(1, 'Recipients must be a non-empty array'),
  subject: z.string().min(1, 'Subject is required'),
});

// ===== Types =====
export type MultipleEmailsBody = z.infer<typeof multipleEmailsBodySchema>;
```

- [ ] **Step 2: Commit**

```bash
git add schema/email.schema.ts
git commit -m "refactor: email schema uses shared recipientSchema from common"
```

---

### Task 6: Rename `schema/login.schema.ts` to `schema/auth.schema.ts`

**Files:**
- Rename: `schema/login.schema.ts` → `schema/auth.schema.ts`

- [ ] **Step 1: Rename the file using git mv**

```bash
git mv schema/login.schema.ts schema/auth.schema.ts
```

- [ ] **Step 2: Rewrite the auth schema file**

Replace the file content with:

```ts
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
```

- [ ] **Step 3: Commit**

```bash
git add schema/auth.schema.ts
git commit -m "refactor: rename login.schema to auth.schema, add refresh token schema"
```

---

### Task 7: Update `schema/signature.schema.ts`

**Files:**
- Modify: `schema/signature.schema.ts`

- [ ] **Step 1: Rewrite signature schema**

Replace the entire file with:

```ts
import { z } from 'zod';

// ===== Request Schemas =====
export const updateSignatureBodySchema = z.object({
  sendAsEmail: z.string().email('Invalid email address'),
  signature: z.string().min(1, 'Signature cannot be empty'),
});

// ===== Types =====
export type UpdateSignatureBody = z.infer<typeof updateSignatureBodySchema>;
```

- [ ] **Step 2: Commit**

```bash
git add schema/signature.schema.ts
git commit -m "refactor: signature schema follows new naming conventions"
```

---

### Task 8: Update `models/user.model.ts` to use Zod types

**Files:**
- Modify: `models/user.model.ts`

- [ ] **Step 1: Rewrite user model to import types from Zod schema**

Replace the entire file with:

```ts
import mongoose, { Document, Schema } from 'mongoose';
import { User } from '../schema/user.schema';

export type UserDocument = User & Document & {
  createdAt: Date;
  updatedAt: Date;
};

const UserSchema = new Schema<UserDocument>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  googleAccessToken: { type: String, required: true },
  googleRefreshToken: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model<UserDocument>('User', UserSchema);
```

- [ ] **Step 2: Commit**

```bash
git add models/user.model.ts
git commit -m "refactor: user model uses Zod-inferred types, drop IUser interface"
```

---

### Task 9: Update `models/campaign.model.ts` to use Zod types

**Files:**
- Modify: `models/campaign.model.ts`

Note: This replaces the old `Recipient` import from `schema/email.schema.ts` — the `Campaign` type from `schema/campaign.schema.ts` now provides the recipients typing via the shared `recipientSchema`.

- [ ] **Step 1: Rewrite campaign model**

Replace the entire file with:

```ts
import mongoose, { Document, Schema } from 'mongoose';
import { Campaign } from '../schema/campaign.schema';

// Omit user_id from Zod type (string) — Mongoose defines it as ObjectId
export type CampaignDocument = Omit<Campaign, 'user_id'> & Document & {
  user_id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const CampaignSchema = new Schema<CampaignDocument>({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  subject: { type: String, required: true },
  content: { type: String, required: true },
  recipients: { type: [Object], required: true },
}, { timestamps: true });

export default mongoose.model<CampaignDocument>('Campaign', CampaignSchema);
```

- [ ] **Step 2: Commit**

```bash
git add models/campaign.model.ts
git commit -m "refactor: campaign model uses Zod-inferred types, drop ICampaign interface"
```

---

## Chunk 3: All services (update imports from IUser to UserDocument)

### Task 10: Update `services/auth.service.ts` imports

**Files:**
- Modify: `services/auth.service.ts`

- [ ] **Step 1: Update import**

Change line 4 from:
```ts
import User, { IUser } from '../models/user.model';
```
to:
```ts
import User, { UserDocument } from '../models/user.model';
```

- [ ] **Step 2: Update function signatures**

Change the `persistUser` function signature (line 92) from:
```ts
const persistUser = async (profile: GoogleProfile, tokens: GoogleTokenResponse): Promise<IUser> => {
```
to:
```ts
const persistUser = async (profile: GoogleProfile, tokens: GoogleTokenResponse): Promise<UserDocument> => {
```

Change the `createAppTokens` function signature (line 113) from:
```ts
const createAppTokens = (user: IUser) => {
```
to:
```ts
const createAppTokens = (user: UserDocument) => {
```

- [ ] **Step 3: Commit**

```bash
git add services/auth.service.ts
git commit -m "refactor: auth service uses UserDocument instead of IUser"
```

---

### Task 11: Update `services/email.service.ts` imports

**Files:**
- Modify: `services/email.service.ts`

- [ ] **Step 1: Update imports to use new types**

Change the imports at the top of the file:

From:
```ts
import User, { IUser } from '../models/user.model';
import { Recipient, MutipleEmailsPostRequestType } from '../schema/email.schema';
```

To:
```ts
import User, { UserDocument } from '../models/user.model';
import { Recipient } from '../schema/common.schema';
import { MultipleEmailsBody } from '../schema/email.schema';
```

- [ ] **Step 2: Update type references in the file**

Change `EmailPayload` type (line 16-18):
```ts
export type EmailPayload = EmailBody & {
    user: UserDocument;
};
```

Change `CustomEmailPayload` type (line 158-160):
```ts
type CustomEmailPayload = MultipleEmailsBody & {
    userId: string;
}
```

- [ ] **Step 3: Commit**

```bash
git add services/email.service.ts
git commit -m "refactor: email service uses Zod-inferred types from common and email schemas"
```

---

### Task 12: Update `services/signature.service.ts` imports

**Files:**
- Modify: `services/signature.service.ts`

- [ ] **Step 1: Update import**

Change line 1 from:
```ts
import User, { IUser } from '../models/user.model';
```
to:
```ts
import User, { UserDocument } from '../models/user.model';
```

- [ ] **Step 2: Update function signature**

Change the `getSignatureList` function signature (line 42) from:
```ts
export const getSignatureList = async (user: IUser, isAlias: boolean = false) => {
```
to:
```ts
export const getSignatureList = async (user: UserDocument, isAlias: boolean = false) => {
```

- [ ] **Step 3: Verify the entire project compiles**

```bash
npx tsc --noEmit
```

Expected: Compilation errors related to routers/controllers that still import old schema names. These will be fixed in the next chunk.

- [ ] **Step 4: Commit**

```bash
git add services/signature.service.ts
git commit -m "refactor: signature service uses UserDocument instead of IUser"
```

---

## Chunk 4: All routers (add validation middleware)

### Task 13: Update `routers/campaign.route.ts` with validation middleware

**Files:**
- Modify: `routers/campaign.route.ts`

Note: This removes the unused `MutipleEmailsPostRequestSchema` import that existed in the old file.

- [ ] **Step 1: Rewrite campaign routes with validation**

Replace the entire file with:

```ts
import express from 'express';
import { verifyToken } from '../middleware/verify-token';
import { validateRequestBody, validateRequestParams } from '../middleware/validation';
import {
  createCampaignBodySchema,
  updateCampaignBodySchema,
  campaignParamsSchema,
} from '../schema/campaign.schema';
import {
  createCampaign,
  deleteCampaignById,
  getAllCampaigns,
  getCampaignById,
  updateCampaign,
} from '../controllers/campaign.controller';

const router = express.Router();

router.post('/',
  verifyToken,
  validateRequestBody(createCampaignBodySchema),
  createCampaign
);

router.get('/', verifyToken, getAllCampaigns);

router.get('/:id',
  verifyToken,
  validateRequestParams(campaignParamsSchema),
  getCampaignById
);

router.put('/:id',
  verifyToken,
  validateRequestParams(campaignParamsSchema),
  validateRequestBody(updateCampaignBodySchema),
  updateCampaign
);

router.delete('/:id',
  verifyToken,
  validateRequestParams(campaignParamsSchema),
  deleteCampaignById
);

export default router;
```

- [ ] **Step 2: Commit**

```bash
git add routers/campaign.route.ts
git commit -m "feat: add Zod validation middleware to all campaign routes"
```

---

### Task 14: Update `routers/email.route.ts` — fix middleware order

**Files:**
- Modify: `routers/email.route.ts`

- [ ] **Step 1: Rewrite email routes with correct middleware order**

Replace the entire file with:

```ts
import express from 'express';
import { submitMultipleEmails } from '../controllers/email.controller';
import { verifyToken } from '../middleware/verify-token';
import { multipleEmailsBodySchema } from '../schema/email.schema';
import { validateRequestBody } from '../middleware/validation';

const router = express.Router();

router.post('/multiple',
  verifyToken,
  validateRequestBody(multipleEmailsBodySchema),
  submitMultipleEmails
);

export default router;
```

Note: `verifyToken` now comes before `validateRequestBody` (was reversed).

- [ ] **Step 2: Commit**

```bash
git add routers/email.route.ts
git commit -m "fix: email route middleware order — verifyToken before validation"
```

---

### Task 15: Update `routers/auth.route.ts` imports

**Files:**
- Modify: `routers/auth.route.ts`

- [ ] **Step 1: Update to use renamed schema**

Replace the entire file with:

```ts
import express from 'express';
import { login, refresh } from '../controllers/auth.controller';
import { validateRequestQuery } from '../middleware/validation';
import { loginQuerySchema } from '../schema/auth.schema';

const router = express.Router();

router.get('/login', validateRequestQuery(loginQuerySchema), login);
router.post('/refresh-token', refresh);

export default router;
```

- [ ] **Step 2: Commit**

```bash
git add routers/auth.route.ts
git commit -m "refactor: auth route uses renamed auth.schema imports"
```

---

### Task 16: Update `routers/signature.route.ts` imports

**Files:**
- Modify: `routers/signature.route.ts`

- [ ] **Step 1: Update import to use new schema name**

Replace the entire file with:

```ts
import express from 'express';
import { getSignatures, updateSignature } from '../controllers/signature.controller';
import { verifyToken } from '../middleware/verify-token';
import { validateRequestBody } from '../middleware/validation';
import { updateSignatureBodySchema } from '../schema/signature.schema';

const router = express.Router();

router.get('/', verifyToken, getSignatures);
router.put('/', verifyToken, validateRequestBody(updateSignatureBodySchema), updateSignature);

export default router;
```

- [ ] **Step 2: Commit**

```bash
git add routers/signature.route.ts
git commit -m "refactor: signature route uses renamed schema export"
```

---

## Chunk 5: All controllers (typed Request generics)

### Task 17: Update `controllers/campaign.controller.ts` with typed Request generics

**Files:**
- Modify: `controllers/campaign.controller.ts`

- [ ] **Step 1: Add typed Request generics to all controller functions**

Replace the entire file with:

```ts
import { NextFunction, Request, Response } from 'express';
import Campaign from '../models/campaign.model';
import { NOT_FOUND_ERROR } from '../utils/error';
import { CreateCampaignBody, UpdateCampaignBody, CampaignParams } from '../schema/campaign.schema';

export const createCampaign = async (
  req: Request<{}, {}, CreateCampaignBody>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, subject, content, recipients } = req.body;
    const newCampaign = new Campaign({ user_id: req.user.sub, name, subject, content, recipients });
    const savedCampaign = await newCampaign.save();
    res.status(201).json({ message: 'Campaign created successfully', data: savedCampaign });
  } catch (error) {
    next(error);
  }
};

export const getAllCampaigns = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaigns = await Campaign.find({ user_id: req.user.sub }).sort({ createdAt: -1 });
    res.json({ message: 'Campaigns retrieved successfully', data: campaigns });
  } catch (error) {
    next(error);
  }
};

export const getCampaignById = async (
  req: Request<CampaignParams>,
  res: Response,
  next: NextFunction
) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      throw new NOT_FOUND_ERROR('Campaign not found');
    }
    res.json({ message: 'Campaign retrieved successfully', data: campaign });
  } catch (error) {
    next(error);
  }
};

export const deleteCampaignById = async (
  req: Request<CampaignParams>,
  res: Response,
  next: NextFunction
) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      throw new NOT_FOUND_ERROR('Campaign not found');
    }
    if (campaign.user_id.toString() !== req.user.sub) {
      throw new NOT_FOUND_ERROR('You do not have permission to delete this campaign');
    }
    await Campaign.findByIdAndDelete(req.params.id);
    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const updateCampaign = async (
  req: Request<CampaignParams, {}, UpdateCampaignBody>,
  res: Response,
  next: NextFunction
) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      throw new NOT_FOUND_ERROR('Campaign not found');
    }
    if (campaign.user_id.toString() !== req.user.sub) {
      throw new NOT_FOUND_ERROR('You do not have permission to update this campaign');
    }
    const { name, subject, content, recipients } = req.body;
    const updatedCampaign = await Campaign.findByIdAndUpdate(
      req.params.id,
      { name, subject, content, recipients },
      { new: true }
    );
    res.json({ message: 'Campaign updated successfully', data: updatedCampaign });
  } catch (error) {
    next(error);
  }
};
```

- [ ] **Step 2: Commit**

```bash
git add controllers/campaign.controller.ts
git commit -m "refactor: campaign controller uses Zod-inferred typed Request generics"
```

---

### Task 18: Update `controllers/email.controller.ts` with typed Request

**Files:**
- Modify: `controllers/email.controller.ts`

- [ ] **Step 1: Update to use new type name**

Replace the entire file with:

```ts
import { Request, Response, NextFunction } from 'express';
import { sendMultipleEmails } from '../services/email.service';
import { UNAUTHORIZED_ERROR } from '../utils/error';
import { MultipleEmailsBody } from '../schema/email.schema';

export const submitMultipleEmails = async (
  req: Request<{}, {}, MultipleEmailsBody>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { content, recipients, subject } = req.body;
    const userId = req.user?.sub as string | undefined;
    if (!userId) {
      throw new UNAUTHORIZED_ERROR('Missing user context');
    }
    await sendMultipleEmails({ content, recipients, userId, subject });

    res.json({
      message: 'All emails accepted',
    });
  } catch (error) {
    next(error);
  }
};
```

- [ ] **Step 2: Commit**

```bash
git add controllers/email.controller.ts
git commit -m "refactor: email controller uses Zod-inferred typed Request"
```

---

### Task 19: Update `controllers/auth.controller.ts` imports

**Files:**
- Modify: `controllers/auth.controller.ts`

- [ ] **Step 1: Update to use renamed schema**

Replace the entire file with:

```ts
import { Request, Response, NextFunction } from 'express';
import { loginWithGoogle, refreshAppToken } from '../services/auth.service';
import { BAD_REQUEST_ERROR } from '../utils/error';
import { extractToken } from '../utils/token';
import { LoginQuery } from '../schema/auth.schema';

const login = async (req: Request<{}, {}, {}, LoginQuery>, res: Response, next: NextFunction) => {
  try {
    const authorizeCode = req.query.authorize_code;

    if (!authorizeCode || typeof authorizeCode !== 'string') {
      throw new BAD_REQUEST_ERROR('authorize_code param is required');
    }

    const result = await loginWithGoogle(authorizeCode);

    res.json(result);
  } catch (error) {
    next(error);
  }
};

const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = extractToken(req.header('Authorization'));

    if (!refreshToken || typeof refreshToken !== 'string') {
      throw new BAD_REQUEST_ERROR('refresh_token is required');
    }

    const tokens = await refreshAppToken(refreshToken);

    res.json(tokens);
  } catch (error) {
    next(error);
  }
};

export { login, refresh };
```

- [ ] **Step 2: Commit**

```bash
git add controllers/auth.controller.ts
git commit -m "refactor: auth controller uses renamed auth.schema imports"
```

---

### Task 20: Update `controllers/signature.controller.ts` — remove inline Zod parsing

**Files:**
- Modify: `controllers/signature.controller.ts`

- [ ] **Step 1: Rewrite signature controller to use typed Request instead of inline parsing**

Replace the entire file with:

```ts
import { Request, Response, NextFunction } from 'express';
import { getSignatureList, updateSignatureService } from '../services/signature.service';
import { UNAUTHORIZED_ERROR } from '../utils/error';
import User from '../models/user.model';
import { UpdateSignatureBody } from '../schema/signature.schema';

export const getSignatures = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.sub as string | undefined;

    if (!userId) {
      throw new UNAUTHORIZED_ERROR('Missing user context');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new UNAUTHORIZED_ERROR('User not found');
    }

    const signatures = await getSignatureList(user);

    res.json({
      message: 'Signatures retrieved successfully',
      data: signatures,
    });
  } catch (error) {
    next(error);
  }
};

export const updateSignature = async (
  req: Request<{}, {}, UpdateSignatureBody>,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.sub as string | undefined;

    if (!userId) {
      throw new UNAUTHORIZED_ERROR('Missing user context');
    }

    const { sendAsEmail, signature } = req.body;

    const result = await updateSignatureService(userId, sendAsEmail, signature);

    res.json({
      message: 'Signature updated successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
```

Key change: Removed `updateSignatureSchema.parse(req.body)` — validation now happens in route middleware.

- [ ] **Step 2: Commit**

```bash
git add controllers/signature.controller.ts
git commit -m "refactor: signature controller uses typed Request, remove inline Zod parsing"
```

---

## Chunk 6: Final verification

### Task 21: Verify compilation and cleanup

- [ ] **Step 1: Verify the entire project compiles**

```bash
npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 2: Verify no remaining references to old types**

Search for any remaining `IUser` or `ICampaign` references:

```bash
grep -r "IUser\|ICampaign" --include="*.ts" --exclude-dir=node_modules .
```

Expected: No results.

Search for any remaining old schema exports:

```bash
grep -r "MutipleEmails\|loginSchema\b\|updateSignatureSchema\b" --include="*.ts" --exclude-dir=node_modules .
```

Expected: No results. (Old names `MutipleEmailsPostRequestSchema`, `loginSchema`, `updateSignatureSchema` should all be replaced.)

- [ ] **Step 3: Verify the app starts**

```bash
npm start
```

Expected: Server starts without errors.

- [ ] **Step 4: Final commit if any cleanup was needed**

```bash
git add -A
git commit -m "chore: cleanup remaining old type references"
```
