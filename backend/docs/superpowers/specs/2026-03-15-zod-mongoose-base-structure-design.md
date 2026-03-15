# Zod-First MVC Base Structure Design

**Date:** 2026-03-15
**Status:** Approved

## Overview

Establish Zod as the single source of truth for entity definitions, request validation, and TypeScript types across the rapid-mail backend. Mongoose models become thin persistence layers importing types from Zod. MVC folder structure is preserved.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Source of truth | Zod-first | Already used for validation; provides `z.infer<>` for types |
| Zod-to-Mongoose | No auto-conversion | Mongoose handles persistence only; Zod handles validation + types |
| File organization | MVC with unified schema files | Minimal change from current structure |
| Request schemas | Independent per endpoint | Explicit, self-contained, no hidden coupling |

## Schema Layer (`schema/`)

Each entity gets one file containing:

1. **Base Zod schema** — defines the entity shape and all field validations
2. **Request schemas** — independent schemas for create body, update body, params, query
3. **Inferred TypeScript types** — via `z.infer<>`

### `schema/common.schema.ts` — Reusable primitives

Shared field-level schemas used across multiple entities. This includes primitives like `objectIdSchema` and reusable composite shapes like `recipientSchema`.

```ts
import { z } from 'zod';

export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');

// Recipient schema uses .catchall(z.string()) to allow dynamic mail-merge fields
// (e.g., FirstName, Company) that are used for email template personalization like [FirstName]
export const recipientSchema = z.object({
  id: z.string(),
  Email: z.string().email('Invalid email address'),
}).catchall(z.string());
```

### `schema/campaign.schema.ts` — Example entity

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
export type Recipient = z.infer<typeof recipientSchema>;
```

## Model Layer (`models/`)

Thin Mongoose schemas. No validation logic — Zod handles that. Types imported from schema files.

### ObjectId string vs. ObjectId duality

Zod schemas define ID fields as `string` (the API/validation shape). Mongoose stores them as `ObjectId`. To handle this, `EntityDocument` omits Zod's string ID fields and lets Mongoose's `Schema.Types.ObjectId` take precedence:

### `models/campaign.model.ts` — Example

```ts
import mongoose, { Document, Schema } from 'mongoose';
import { Campaign } from '../schema/campaign.schema';

// Omit user_id from Zod type (string) — Mongoose defines it as ObjectId
export type CampaignDocument = Omit<Campaign, 'user_id'> & Document & {
  user_id: mongoose.Types.ObjectId;
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

**Key points:**
- `Campaign` type comes from Zod — single source of truth for field shapes
- `CampaignDocument` omits `user_id` from Zod (string) and redefines it as `mongoose.Types.ObjectId` to match what Mongoose actually stores/returns
- `timestamps: true` adds `createdAt`/`updatedAt` (DB-managed, not in Zod)

## Validation Middleware (`middleware/validation.ts`)

The existing middleware must be updated to **write parsed data back** to `req[source]`. Without this, Zod transforms/defaults are lost and the typed `Request` generics in controllers would not match the actual runtime data.

### Updated `middleware/validation.ts`

```ts
import { RequestHandler } from 'express';
import { ZodTypeAny, z } from 'zod';
import { UNPROCESSABLE_ENTITY_ERROR } from '../utils/error';

const validate = (
  schema: ZodTypeAny,
  source: 'body' | 'params' | 'query'
): RequestHandler => {
  return async (req, res, next) => {
    try {
      req[source] = await schema.parseAsync(req[source]);
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errorMessage = err.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ');
        next(new UNPROCESSABLE_ENTITY_ERROR(errorMessage));
      } else {
        next(err);
      }
    }
  };
};

const validateRequestBody = (schema: ZodTypeAny): RequestHandler => {
  return validate(schema, 'body');
};

const validateRequestParams = (schema: ZodTypeAny): RequestHandler => {
  return validate(schema, 'params');
};

const validateRequestQuery = (schema: ZodTypeAny): RequestHandler => {
  return validate(schema, 'query');
};

export { validateRequestBody, validateRequestParams, validateRequestQuery };
```

## Route Layer (`routers/`)

Every route applies Zod validation middleware before the controller.

**Pattern:** `verifyToken` first, then params validation, then body validation, then controller.

### `routers/campaign.route.ts` — Example

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

## Controller Layer (`controllers/`)

Controllers use Zod-inferred types as Express Request generics. No type assertions needed.

### Example usage

```ts
import { Request, Response, NextFunction } from 'express';
import { CreateCampaignBody, UpdateCampaignBody, CampaignParams } from '../schema/campaign.schema';

export const createCampaign = async (
  req: Request<{}, {}, CreateCampaignBody>,
  res: Response,
  next: NextFunction
) => {
  const { name, subject, content, recipients } = req.body; // typed
  // ...
};

export const updateCampaign = async (
  req: Request<CampaignParams, {}, UpdateCampaignBody>,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params; // typed as string (validated ObjectId)
  // ...
};
```

**Express `Request<Params, ResBody, ReqBody, Query>`** generic accepts Zod-inferred types directly.

## Service Layer (`services/`)

Services import Zod-inferred types for function parameters. Service-specific composite types (e.g., types that combine request data with auth context) are defined locally in the service file.

### Example: `services/email.service.ts`

```ts
import { Recipient } from '../schema/common.schema';
import { IUser } from '../schema/user.schema';

// Service-specific composite type — defined here, not in schema/
interface SendEmailParams {
  user: IUser;
  subject: string;
  content: string;
  recipients: Recipient[];
}

export const sendMultipleEmails = async (params: SendEmailParams) => {
  // ...
};
```

**Key points:**
- Import entity/field types from `schema/` files
- Composite types that combine multiple concerns (e.g., request data + auth user) stay in the service file
- Services do not import Zod schemas directly — only the inferred types

## Type Flow

```
schema/*.schema.ts (Zod) → z.infer<> → types used in:
  ├── models/*.model.ts      (EntityDocument = Omit<Entity, 'id_fields'> & Document & { id_fields: ObjectId })
  ├── controllers/*.ts       (Request<Params, {}, Body>)
  └── services/*.ts          (function params using imported types; composite types defined locally)
```

## Request Data Flow

```
Request → Router → verifyToken → validateParams/Body/Query (Zod, writes parsed data back) → Controller (typed) → Service → Model (Mongoose)
```

## Final Folder Structure

```
schema/
  common.schema.ts          # objectIdSchema, recipientSchema, paginationSchema, etc.
  campaign.schema.ts         # Base schema + request schemas + types
  email.schema.ts            # Base schema + request schemas + types
  auth.schema.ts             # Request schemas + types (renamed from login.schema.ts)
  signature.schema.ts        # Base schema + request schemas + types
  user.schema.ts             # Base schema + types
models/
  campaign.model.ts          # Thin Mongoose, imports types from schema/
  user.model.ts              # Thin Mongoose, imports types from schema/
controllers/
  campaign.controller.ts     # Uses Zod-inferred types for req typing
  email.controller.ts
  auth.controller.ts
  signature.controller.ts
services/
  email.service.ts
  auth.service.ts
  signature.service.ts
routers/
  index.ts
  campaign.route.ts          # Validation middleware on every endpoint
  email.route.ts
  auth.route.ts
  signature.route.ts
middleware/
  verify-token.ts
  validation.ts              # Updated: writes parsed data back to req
  error-handler.ts
utils/
  error.ts
  token.ts
  wiston-log.ts
config/
  env.ts
  mongodb.ts
```

## What Changes From Today

| Area | Change |
|------|--------|
| `schema/` | Files grow to include base entity schema + all request schemas + types |
| `schema/login.schema.ts` | Renamed to `schema/auth.schema.ts` |
| `schema/common.schema.ts` | New file: shared primitives (objectIdSchema, recipientSchema) |
| `schema/user.schema.ts` | New file: user entity Zod schema (currently has none) |
| `models/` | Drop `IUser`/`ICampaign` interfaces, import types from schema. Use `Omit` pattern for ObjectId fields |
| `routers/` | Add validation middleware to every endpoint (currently only email has it) |
| `routers/email.route.ts` | Fix middleware order: `verifyToken` before `validateRequestBody` (currently reversed) |
| `controllers/` | Add typed Request generics |
| `controllers/signature.controller.ts` | Remove inline Zod parsing (`updateSignatureSchema.parse(req.body)`), move to route-level middleware |
| `middleware/validation.ts` | Update: write `schema.parseAsync()` result back to `req[source]` |
