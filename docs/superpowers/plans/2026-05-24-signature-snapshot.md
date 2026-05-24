# Signature Snapshot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Snapshot the active account's signature to `config.json` when a campaign starts sending, use it in the worker instead of a DB query, and surface it via `GET /campaigns/:id` so the frontend can display it consistently in PreviewModal and DeliveryDetailsModal.

**Architecture:** Backend writes `config.json` at send-time and reads it in the worker and in GET campaign. Frontend drops its own signature fetch and uses `campaign.signature` everywhere.

**Tech Stack:** Node.js/TypeScript (Express, Mongoose), React 19/TypeScript (Redux Toolkit, Vite)

---

## File Map

| File | Change |
|------|--------|
| `backend/services/file-storage.service.ts` | Add `writeCampaignConfig` / `readCampaignConfig` |
| `backend/controllers/campaign-send.controller.ts` | Resolve + snapshot signature before setting status=sending |
| `backend/worker/consumer.ts` | Replace DB signature lookup with `readCampaignConfig` |
| `backend/controllers/campaign.controller.ts` | `getCampaignById` appends `signature` field to response |
| `frontend/src/schema/campaign.ts` | Add `signature?: string` to `Campaign` interface |
| `frontend/src/pages/email-template/EmailTemplate.tsx` | Remove `getDefaultSignatureApi`, use `campaign.signature` |
| `frontend/src/components/CampaignDetailsModal.tsx` | Pass `signature={campaign.signature}` to `DeliveryDetailsModal` |

---

## Task 1: Add config.json helpers to file-storage.service.ts

**Files:**
- Modify: `backend/services/file-storage.service.ts`

- [ ] **Step 1: Add `writeCampaignConfig` and `readCampaignConfig` to the service**

Append to the end of `backend/services/file-storage.service.ts`:

```ts
const buildConfigPath = (campaignId: string) =>
    path.join(ATTACHMENTS_DIR, campaignId, 'config.json');

export const writeCampaignConfig = (campaignId: string, config: { signature: string }): void => {
    const campaignDir = buildCampaignDir(campaignId);
    fs.mkdirSync(campaignDir, { recursive: true });
    fs.writeFileSync(buildConfigPath(campaignId), JSON.stringify(config), 'utf-8');
};

export const readCampaignConfig = (campaignId: string): { signature: string } | null => {
    const configPath = buildConfigPath(campaignId);
    if (!fs.existsSync(configPath)) return null;
    try {
        return JSON.parse(fs.readFileSync(configPath, 'utf-8')) as { signature: string };
    } catch {
        return null;
    }
};
```

- [ ] **Step 2: Commit**

```bash
git add backend/services/file-storage.service.ts
git commit -m "feat: add writeCampaignConfig and readCampaignConfig helpers"
```

---

## Task 2: Snapshot signature in sendCampaign controller

**Files:**
- Modify: `backend/controllers/campaign-send.controller.ts`

- [ ] **Step 1: Update imports**

Replace the import block at the top of `backend/controllers/campaign-send.controller.ts`:

```ts
import { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Campaign, { EmailJob } from '../models/campaign.model';
import { publishEmailJob } from '../services/rabbitmq.service';
import { SendCampaignBody, CampaignSendParams } from '../schema/send.schema';
import { BAD_REQUEST_ERROR, NOT_FOUND_ERROR, UNAUTHORIZED_ERROR } from '../utils/error';
import User from '../models/user.model';
import Signature from '../models/signature.model';
import { writeCampaignConfig } from '../services/file-storage.service';
```

- [ ] **Step 2: Add signature resolution before `campaign.status = 'sending'`**

In the `sendCampaign` function, after the `emailJobs` loop and before `campaign.email_jobs = emailJobs`, insert:

```ts
    const user = await User.findById(campaign.user_id);
    if (!user) throw new NOT_FOUND_ERROR('User not found');

    const activeAccount = user.activeAccountId
      ? (user.connectedAccounts || []).find(
          (acc: any) => acc._id.toString() === String(user.activeAccountId)
        )
      : null;
    const senderEmail = activeAccount?.email || user.email;

    const matchedSignature = await Signature.findOne({
      userId: campaign.user_id,
      sourceEmail: senderEmail,
    }).lean();
    const snapshotSignature = matchedSignature?.content ?? '';

    writeCampaignConfig(campaign._id.toString(), { signature: snapshotSignature });
```

- [ ] **Step 3: Verify the full sendCampaign function looks correct**

The function should now:
1. Find campaign, validate ownership/status/recipients
2. Build `emailJobs` loop
3. Resolve user → activeAccount email → signature → `writeCampaignConfig`
4. Set `campaign.email_jobs`, `campaign.status = 'sending'`, `campaign.sendMode`
5. Save and respond

- [ ] **Step 4: Commit**

```bash
git add backend/controllers/campaign-send.controller.ts
git commit -m "feat: snapshot signature to config.json on campaign send"
```

---

## Task 3: Use config.json in worker consumer

**Files:**
- Modify: `backend/worker/consumer.ts`

- [ ] **Step 1: Update imports — remove Signature, add readCampaignConfig**

Replace:
```ts
import Signature from '../models/signature.model';
```
With:
```ts
import { readCampaignConfig, readFile } from '../services/file-storage.service';
```

(Keep `readFile` — it was already imported. The full import line for file-storage should be:)
```ts
import { readCampaignConfig, readFile } from '../services/file-storage.service';
```

- [ ] **Step 2: Replace DB signature lookup with config read**

Find and remove this block in `startConsumer`:

```ts
      const matchedSignature =
        await Signature.findOne({ userId: campaign.user_id, sourceEmail: senderEmail }).lean() ??
        await Signature.findOne({ userId: campaign.user_id, isDefault: true }).lean();
      const signature = matchedSignature?.content || '';
```

Also remove:
```ts
      const user = await User.findById(campaign.user_id);
      if (!user) throw new Error(`User not found for campaign ${campaignId}`);

      const activeAccount = user.activeAccountId
        ? (user.connectedAccounts || []).find(
            (acc: any) => acc._id.toString() === String(user.activeAccountId)
          )
        : null;
      const senderEmail = activeAccount?.email || user.email;
```

Replace all of the above with:

```ts
      const config = readCampaignConfig(campaignId);
      const signature = config?.signature ?? '';
```

Note: `user` is still needed for `sendEmail`. Check if `sendEmail` uses `user` — it does (`user` is passed as argument). So keep `User.findById` but remove only the signature-related lines. The final block should read:

```ts
      const user = await User.findById(campaign.user_id);
      if (!user) throw new Error(`User not found for campaign ${campaignId}`);

      const config = readCampaignConfig(campaignId);
      const signature = config?.signature ?? '';
```

Remove `activeAccount` and `senderEmail` variables entirely since they're no longer needed.

- [ ] **Step 3: Remove the now-unused User import if applicable**

Check if `User` is still used (it is, for `sendEmail`). Keep it. Only `Signature` import should be removed.

- [ ] **Step 4: Commit**

```bash
git add backend/worker/consumer.ts
git commit -m "refactor: read signature from config.json in worker instead of DB"
```

---

## Task 4: Add signature to GET /campaigns/:id response

**Files:**
- Modify: `backend/controllers/campaign.controller.ts`

- [ ] **Step 1: Update imports**

Replace:
```ts
import { saveFiles, deleteFiles, deleteSingleFile } from '../services/file-storage.service';
```
With:
```ts
import { saveFiles, deleteFiles, deleteSingleFile, readCampaignConfig } from '../services/file-storage.service';
import User from '../models/user.model';
import Signature from '../models/signature.model';
```

- [ ] **Step 2: Update `getCampaignById` to include signature**

Replace the existing `getCampaignById` function:

```ts
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

    let signature = '';

    if (campaign.status === 'draft') {
      const user = await User.findById(req.user.sub);
      if (user) {
        const activeAccount = user.activeAccountId
          ? (user.connectedAccounts || []).find(
              (acc: any) => acc._id.toString() === String(user.activeAccountId)
            )
          : null;
        const senderEmail = activeAccount?.email || user.email;
        const matchedSignature = await Signature.findOne({
          userId: campaign.user_id,
          sourceEmail: senderEmail,
        }).lean();
        signature = matchedSignature?.content ?? '';
      }
    } else {
      const config = readCampaignConfig(campaign._id.toString());
      signature = config?.signature ?? '';
    }

    res.json({
      message: 'Campaign retrieved successfully',
      data: { ...campaign.toObject(), signature },
    });
  } catch (error) {
    next(error);
  }
};
```

- [ ] **Step 3: Commit**

```bash
git add backend/controllers/campaign.controller.ts
git commit -m "feat: include signature in GET /campaigns/:id response"
```

---

## Task 5: Add signature field to frontend Campaign type

**Files:**
- Modify: `frontend/src/schema/campaign.ts`

- [ ] **Step 1: Add `signature` to the `Campaign` interface**

In `frontend/src/schema/campaign.ts`, find the `Campaign` interface (line ~94) and add the field:

```ts
export interface Campaign {
    _id: string;
    name: string;
    subject: string;
    content: string;
    status?: CampaignStatus;
    sendMode?: SendMode | null;
    email_jobs?: Record<string, EmailJob>;
    recipients: Recipient[];
    attachments?: Attachment[];
    signature?: string;
    createdAt: string;
    updatedAt: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/schema/campaign.ts
git commit -m "feat: add signature field to Campaign type"
```

---

## Task 6: Update EmailTemplate.tsx to use campaign.signature

**Files:**
- Modify: `frontend/src/pages/email-template/EmailTemplate.tsx`

- [ ] **Step 1: Remove `getDefaultSignatureApi` import**

Remove this line:
```ts
import { getDefaultSignatureApi } from '@/features/signature/signatureApi';
```

- [ ] **Step 2: Remove defaultSignature state and useEffect**

Remove these lines (around line 114–122):
```ts
    // Signature
    const [defaultSignature, setDefaultSignature] = useState<string | undefined>();

    useEffect(() => {
        dispatch(getDefaultSignatureApi(activeAccountId)).then((action) => {
            if (getDefaultSignatureApi.fulfilled.match(action)) {
                setDefaultSignature(action.payload?.content ?? undefined);
            }
        });
    }, [dispatch, activeAccountId]);
```

- [ ] **Step 3: Update PreviewModal to use campaign.signature**

Find `signature={defaultSignature}` in the PreviewModal JSX (~line 681) and replace with:
```tsx
signature={campaignMeta?.signature}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/email-template/EmailTemplate.tsx
git commit -m "refactor: use campaign.signature in PreviewModal, remove separate signature fetch"
```

---

## Task 7: Pass signature to DeliveryDetailsModal in CampaignDetailsModal

**Files:**
- Modify: `frontend/src/components/CampaignDetailsModal.tsx`

- [ ] **Step 1: Inspect the DeliveryDetailsModal usage**

Find the `<DeliveryDetailsModal` block (~line 311). It currently passes `subject`, `content`, `attachments` but not `signature`. The `campaign` prop is already available in this component.

- [ ] **Step 2: Add signature prop**

Update the `<DeliveryDetailsModal` JSX to add:
```tsx
{selectedRecipient && (
    <DeliveryDetailsModal
        open={isDetailsModalOpen}
        onOpenChange={setIsDetailsModalOpen}
        recipient={selectedRecipient}
        onResend={() => handleResendSingle(selectedRecipient)}
        subject={campaign.subject}
        content={campaign.content}
        signature={campaign.signature}
        attachments={campaignAttachments}
    />
)}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/CampaignDetailsModal.tsx
git commit -m "feat: pass campaign.signature to DeliveryDetailsModal"
```

---

## Self-Review

**Spec coverage:**
- ✅ `config.json` helpers — Task 1
- ✅ Snapshot at send time — Task 2
- ✅ Worker reads from config — Task 3
- ✅ `GET /campaigns/:id` returns signature (draft=DB, non-draft=config.json) — Task 4
- ✅ Frontend Campaign type updated — Task 5
- ✅ EmailTemplate uses campaign.signature, removes old fetch — Task 6
- ✅ DeliveryDetailsModal receives signature — Task 7

**Edge cases covered:**
- Campaign dir may not exist when `writeCampaignConfig` is called (no attachments) → `mkdirSync({ recursive: true })` in Task 1
- Old campaigns without `config.json` → `readCampaignConfig` returns `null` → `''` signature — safe
- No active account → falls back to `user.email` for lookup — same as before
