# Signature Snapshot for Campaign Send & Overview

**Date:** 2026-05-24

## Problem

When a campaign is in progress or completed, the overview (`DeliveryDetailsModal`) and email preview (`PreviewModal` in `EmailTemplate`) have no access to the signature that was actually used when sending. Currently the worker resolves the signature at job-consumption time from the DB, which may have changed since the campaign was sent.

## Goal

- Snapshot the signature at the moment `POST /campaigns/:id/send` is called
- Store it in `config.json` alongside the campaign's attachments
- Worker reads from `config.json` instead of querying the DB
- `GET /campaigns/:id` always returns a `signature` field — from DB for draft, from `config.json` for non-draft
- Frontend uses `campaign.signature` everywhere (no separate signature fetch)

---

## Backend Changes

### `file-storage.service.ts`

Add two helpers:

```ts
writeCampaignConfig(campaignId: string, config: { signature: string }): void
readCampaignConfig(campaignId: string): { signature: string } | null
```

File path: `attachments/{campaignId}/config.json`
`readCampaignConfig` returns `null` if the file does not exist (campaigns created before this feature).

### `sendCampaign` controller (`campaign-send.controller.ts`)

Before setting `campaign.status = 'sending'`, resolve signature:
1. Fetch `User` to get `activeAccountId` → derive `activeAccountEmail`
2. `Signature.findOne({ userId, sourceEmail: activeAccountEmail })`
3. If not found → `signature = ''`

Then call `writeCampaignConfig(campaignId, { signature })`.

No `isDefault` fallback.

### Worker `consumer.ts`

Replace the `Signature.findOne(...)` DB query with:

```ts
const config = readCampaignConfig(campaignId);
const signature = config?.signature ?? '';
```

Remove the `Signature` import from the worker.

### `campaign.controller.ts` — `GET /campaigns/:id`

Append `signature` to the response:

- **`draft`**: query `User` → `activeAccountEmail` → `Signature.findOne({ sourceEmail })` → fallback `''`
- **non-draft**: `readCampaignConfig(campaignId)?.signature ?? ''`

Response shape gains: `signature: string`

---

## Frontend Changes

### Campaign type (`campaignApi.tsx` or schema)

Add `signature: string` to the campaign response type.

### `EmailTemplate.tsx`

- Remove `getDefaultSignatureApi` call and related state
- Pass `campaign.signature` to `PreviewModal`

### `CampaignDetailsModal.tsx`

- Pass `signature={campaign.signature}` to `DeliveryDetailsModal`

---

## Edge Cases

- **No active account**: `activeAccountEmail` falls back to `user.email`; if no signature matches, `signature = ''`
- **Campaign has no attachments dir yet**: `writeCampaignConfig` calls `mkdirSync` (already done by `saveFiles`, but must be safe to call again)
- **Old campaigns (pre-feature)**: `readCampaignConfig` returns `null` → `signature = ''` — safe, no crash
