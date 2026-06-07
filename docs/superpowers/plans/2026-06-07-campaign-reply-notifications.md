# Campaign Reply Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Khi recipient reply lại email campaign, user thấy notification bell ở Header với danh sách reply kèm preview nội dung.

**Architecture:** Gmail API trả về `threadId` khi gửi mail — lưu vào `email_jobs`. Backend đăng ký `gmail.users.watch()` để Gmail push notification đến webhook endpoint khi có mail mới. Webhook gọi `history.list`, so khớp `threadId` với campaign jobs, lưu Reply. Frontend poll `/v1/replies` mỗi 30s để hiển thị notification bell.

**Tech Stack:** Node.js/TypeScript, Express, Mongoose, Gmail REST API (fetch trực tiếp, không dùng googleapis SDK), React, Redux Toolkit, shadcn/ui, lucide-react

---

## File Map

### Backend — Modified
- `backend/services/email.service.ts` — capture thêm `threadId` từ Gmail response, trả về trong sendEmail result
- `backend/models/campaign.model.ts` — thêm `threadId` và `messageId` vào `EmailJob` type và schema
- `backend/models/user.model.ts` — thêm `gmailWatchExpiry` và `gmailHistoryId` vào `ConnectedAccountSchema`
- `backend/worker/consumer.ts` — lưu `threadId` + `messageId` khi updateJobStatus sau khi gửi thành công
- `backend/config/env.ts` — thêm `GOOGLE_PUBSUB_TOPIC`
- `backend/routers/index.ts` — đăng ký reply router và pubsub webhook router

### Backend — Created
- `backend/models/reply.model.ts` — Mongoose model cho Reply document
- `backend/services/gmail-watch.service.ts` — setup và renew `gmail.users.watch()`
- `backend/controllers/pubsub-webhook.controller.ts` — nhận Pub/Sub push, gọi history.list, lưu reply
- `backend/controllers/reply.controller.ts` — GET /replies, PATCH /replies/:id/read
- `backend/routers/pubsub.router.ts` — POST /webhooks/gmail (no auth)
- `backend/routers/reply.router.ts` — GET /replies, PATCH /replies/:id/read (auth required)
- `backend/worker/watch-renewer.ts` — cron renew watch mỗi 6 ngày

### Frontend — Modified
- `frontend/src/components/layout/Header.tsx` — thêm NotificationBell component
- `frontend/src/interceptors/` hoặc utils — không cần thay đổi

### Frontend — Created
- `frontend/src/features/reply/replyApi.ts` — fetchReplies, markReplyRead
- `frontend/src/hooks/useReplies.ts` — poll GET /replies?unread=true mỗi 30s
- `frontend/src/components/NotificationBell.tsx` — bell icon + badge + dropdown

---

## Task 1: Capture threadId khi gửi email

**Files:**
- Modify: `backend/services/email.service.ts`

- [ ] **Step 1: Cập nhật `sendWithGmailApi` để trả về `threadId`**

Tìm đoạn (khoảng line 267-273):
```ts
const data = response.data as { id?: string; error?: { message?: string } };

if (response.status >= 400 || !data.id) {
    throw new BAD_REQUEST_ERROR(data.error?.message || 'Failed to send email with Gmail API');
}

return { needRefresh: false, messageId: data.id } as const;
```

Thay bằng:
```ts
const data = response.data as { id?: string; threadId?: string; error?: { message?: string } };

if (response.status >= 400 || !data.id) {
    throw new BAD_REQUEST_ERROR(data.error?.message || 'Failed to send email with Gmail API');
}

return { needRefresh: false, messageId: data.id, threadId: data.threadId ?? null } as const;
```

- [ ] **Step 2: Cập nhật nơi `sendWithGmailApi` trả về `needRefresh: true` (line 264)**

```ts
return { needRefresh: true, messageId: null, threadId: null } as const;
```

- [ ] **Step 3: Cập nhật return của `sendEmail` function (khoảng line 364-369)**

Tìm:
```ts
return {
    content: content.trim(),
    receivers: uniqueReceivers,
    status: 'sent',
    messageId: sendResult.messageId,
};
```

Thay bằng:
```ts
return {
    content: content.trim(),
    receivers: uniqueReceivers,
    status: 'sent',
    messageId: sendResult.messageId,
    threadId: sendResult.threadId,
};
```

- [ ] **Step 4: Cập nhật return trong nhánh error (khoảng line 318-322)**

Tìm:
```ts
return {
    content,
    receivers: uniqueReceivers,
    status: 'failed' as const,
    messageId: null,
};
```

Thay bằng:
```ts
return {
    content,
    receivers: uniqueReceivers,
    status: 'failed' as const,
    messageId: null,
    threadId: null,
};
```

- [ ] **Step 5: Commit**
```bash
git add backend/services/email.service.ts
git commit -m "feat: capture threadId from Gmail API send response"
```

---

## Task 2: Thêm threadId/messageId vào EmailJob model

**Files:**
- Modify: `backend/models/campaign.model.ts`

- [ ] **Step 1: Thêm fields vào `EmailJob` type**

Tìm:
```ts
export type EmailJob = {
  recipientData: Record<string, string>;
  status: EmailJobStatus;
  scheduledAt: Date;
  sentAt: Date | null;
  error: string | null;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
};
```

Thay bằng:
```ts
export type EmailJob = {
  recipientData: Record<string, string>;
  status: EmailJobStatus;
  scheduledAt: Date;
  sentAt: Date | null;
  error: string | null;
  retryCount: number;
  threadId: string | null;
  messageId: string | null;
  createdAt: Date;
  updatedAt: Date;
};
```

- [ ] **Step 2: Commit**
```bash
git add backend/models/campaign.model.ts
git commit -m "feat: add threadId and messageId to EmailJob type"
```

---

## Task 3: Lưu threadId/messageId vào job sau khi gửi thành công

**Files:**
- Modify: `backend/worker/consumer.ts`

- [ ] **Step 1: Cập nhật lời gọi `sendEmail` để bắt threadId**

Tìm (khoảng line 118-127):
```ts
      await sendEmail({
        content: personalizedContent,
        receivers: [job.recipientData['Email']],
        user,
        subject: campaign.subject,
        signature,
        attachments: emailAttachments,
      });

      await updateJobStatus(campaignId, jobId, { status: 'sent', sentAt: new Date() });
```

Thay bằng:
```ts
      const sendResult = await sendEmail({
        content: personalizedContent,
        receivers: [job.recipientData['Email']],
        user,
        subject: campaign.subject,
        signature,
        attachments: emailAttachments,
      });

      await updateJobStatus(campaignId, jobId, {
        status: 'sent',
        sentAt: new Date(),
        threadId: sendResult.threadId ?? null,
        messageId: sendResult.messageId ?? null,
      });
```

- [ ] **Step 2: Commit**
```bash
git add backend/worker/consumer.ts
git commit -m "feat: store threadId and messageId in email_jobs after send"
```

---

## Task 4: Thêm gmailWatchExpiry/gmailHistoryId vào User model

**Files:**
- Modify: `backend/models/user.model.ts`

- [ ] **Step 1: Cập nhật `ConnectedAccountSchema`**

Tìm:
```ts
const ConnectedAccountSchema = new Schema({
  email: { type: String, required: true },
  provider: { type: String, enum: ['gmail', 'outlook'], required: true },
  accessToken: { type: String, required: true },
  refreshToken: { type: String },
}, { _id: true });
```

Thay bằng:
```ts
const ConnectedAccountSchema = new Schema({
  email: { type: String, required: true },
  provider: { type: String, enum: ['gmail', 'outlook'], required: true },
  accessToken: { type: String, required: true },
  refreshToken: { type: String },
  gmailWatchExpiry: { type: Date, default: null },
  gmailHistoryId: { type: String, default: null },
}, { _id: true });
```

- [ ] **Step 2: Cập nhật `UserDocument` type để include connected account shape**

Tìm:
```ts
export type UserDocument = User & Document & {
  createdAt: Date;
  updatedAt: Date;
};
```

Thay bằng:
```ts
export type ConnectedAccount = {
  _id: mongoose.Types.ObjectId;
  email: string;
  provider: 'gmail' | 'outlook';
  accessToken: string;
  refreshToken?: string;
  gmailWatchExpiry: Date | null;
  gmailHistoryId: string | null;
};

export type UserDocument = User & Document & {
  createdAt: Date;
  updatedAt: Date;
  connectedAccounts: ConnectedAccount[];
};
```

Thêm `import mongoose from 'mongoose';` nếu chưa có (đã có rồi).

- [ ] **Step 3: Commit**
```bash
git add backend/models/user.model.ts
git commit -m "feat: add gmailWatchExpiry and gmailHistoryId to ConnectedAccount"
```

---

## Task 5: Tạo Reply model

**Files:**
- Create: `backend/models/reply.model.ts`

- [ ] **Step 1: Tạo file**

```ts
import mongoose, { Document, Schema } from 'mongoose';

export type ReplyDocument = Document & {
  campaignId: mongoose.Types.ObjectId;
  jobId: string;
  recipientEmail: string;
  threadId: string;
  replyMessageId: string;
  snippet: string;
  receivedAt: Date;
  isRead: boolean;
  userId: mongoose.Types.ObjectId;
};

const ReplySchema = new Schema<ReplyDocument>({
  campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true },
  jobId: { type: String, required: true },
  recipientEmail: { type: String, required: true },
  threadId: { type: String, required: true },
  replyMessageId: { type: String, required: true, unique: true },
  snippet: { type: String, default: '' },
  receivedAt: { type: Date, required: true },
  isRead: { type: Boolean, default: false },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
});

ReplySchema.index({ userId: 1, isRead: 1 });
ReplySchema.index({ threadId: 1 });

export default mongoose.model<ReplyDocument>('Reply', ReplySchema);
```

- [ ] **Step 2: Commit**
```bash
git add backend/models/reply.model.ts
git commit -m "feat: add Reply model"
```

---

## Task 6: Tạo gmail-watch.service.ts

**Files:**
- Create: `backend/services/gmail-watch.service.ts`
- Modify: `backend/config/env.ts`

- [ ] **Step 1: Thêm `GOOGLE_PUBSUB_TOPIC` vào env config**

Thêm vào cuối object trong `backend/config/env.ts`:
```ts
GOOGLE_PUBSUB_TOPIC: process.env.GOOGLE_PUBSUB_TOPIC || '',
```

- [ ] **Step 2: Tạo gmail-watch.service.ts**

```ts
import User, { ConnectedAccount } from '../models/user.model';
import settings from '../config/env';
import logger from '../utils/wiston-log';

const GMAIL_WATCH_ENDPOINT = 'https://gmail.googleapis.com/gmail/v1/users/me/watch';
// 7 days in ms, we renew after 6 days
const WATCH_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export const setupGmailWatch = async (
  userId: string,
  accountId: string,
  accessToken: string
): Promise<void> => {
  const response = await fetch(GMAIL_WATCH_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      topicName: settings.GOOGLE_PUBSUB_TOPIC,
      labelIds: ['INBOX'],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    logger.error('Failed to setup Gmail watch', { userId, accountId, err });
    return;
  }

  const data = await response.json() as { historyId: string; expiration: string };

  await User.findOneAndUpdate(
    { _id: userId, 'connectedAccounts._id': accountId },
    {
      $set: {
        'connectedAccounts.$.gmailHistoryId': data.historyId,
        'connectedAccounts.$.gmailWatchExpiry': new Date(Number(data.expiration)),
      },
    }
  );

  logger.info('Gmail watch setup', { userId, accountId, historyId: data.historyId });
};

export const renewExpiringWatches = async (): Promise<void> => {
  const threshold = new Date(Date.now() + 24 * 60 * 60 * 1000); // expires within 24h
  const users = await User.find({
    'connectedAccounts': {
      $elemMatch: {
        provider: 'gmail',
        gmailWatchExpiry: { $lt: threshold },
      },
    },
  });

  for (const user of users) {
    for (const account of user.connectedAccounts) {
      if (
        account.provider !== 'gmail' ||
        !account.gmailWatchExpiry ||
        account.gmailWatchExpiry > threshold
      ) continue;

      await setupGmailWatch(
        user._id.toString(),
        account._id.toString(),
        account.accessToken
      );
    }
  }
};
```

- [ ] **Step 3: Commit**
```bash
git add backend/services/gmail-watch.service.ts backend/config/env.ts
git commit -m "feat: add gmail-watch service for Pub/Sub watch setup and renewal"
```

---

## Task 7: Tạo pubsub-webhook.controller.ts

**Files:**
- Create: `backend/controllers/pubsub-webhook.controller.ts`

Webhook này nhận POST từ Google Pub/Sub, decode payload, gọi Gmail `history.list`, tìm reply trong campaign threads, lưu vào Reply model.

- [ ] **Step 1: Tạo file**

```ts
import { Request, Response } from 'express';
import User from '../models/user.model';
import Campaign, { EmailJob } from '../models/campaign.model';
import Reply from '../models/reply.model';
import logger from '../utils/wiston-log';

const GMAIL_HISTORY_ENDPOINT = 'https://gmail.googleapis.com/gmail/v1/users/me/history';
const GMAIL_MESSAGE_ENDPOINT = 'https://gmail.googleapis.com/gmail/v1/users/me/messages';

type HistoryMessage = {
  id: string;
  threadId: string;
};

type HistoryRecord = {
  messagesAdded?: { message: HistoryMessage }[];
};

const fetchHistory = async (
  accessToken: string,
  startHistoryId: string
): Promise<{ messages: HistoryMessage[]; newHistoryId: string | null }> => {
  const url = `${GMAIL_HISTORY_ENDPOINT}?startHistoryId=${startHistoryId}&historyTypes=messageAdded&labelId=INBOX`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) return { messages: [], newHistoryId: null };

  const data = await response.json() as {
    history?: HistoryRecord[];
    historyId?: string;
  };

  const messages: HistoryMessage[] = (data.history ?? []).flatMap(
    (h) => (h.messagesAdded ?? []).map((m) => m.message)
  );

  return { messages, newHistoryId: data.historyId ?? null };
};

const fetchMessageSnippet = async (
  accessToken: string,
  messageId: string
): Promise<string> => {
  const response = await fetch(`${GMAIL_MESSAGE_ENDPOINT}/${messageId}?format=metadata`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return '';
  const data = await response.json() as { snippet?: string };
  return (data.snippet ?? '').slice(0, 200);
};

export const handlePubSubWebhook = async (req: Request, res: Response): Promise<void> => {
  // Pub/Sub always expects 200 quickly, or it will retry
  res.status(200).send('ok');

  try {
    const message = req.body?.message;
    if (!message?.data) return;

    const decoded = JSON.parse(Buffer.from(message.data, 'base64').toString('utf-8')) as {
      emailAddress?: string;
      historyId?: string;
    };

    const { emailAddress, historyId: newHistoryId } = decoded;
    if (!emailAddress || !newHistoryId) return;

    // Find the user with this gmail connected account
    const user = await User.findOne({
      'connectedAccounts': {
        $elemMatch: { provider: 'gmail', email: emailAddress },
      },
    });
    if (!user) return;

    const account = user.connectedAccounts.find(
      (a) => a.provider === 'gmail' && a.email === emailAddress
    );
    if (!account?.gmailHistoryId) return;

    const { messages, newHistoryId: latestHistoryId } = await fetchHistory(
      account.accessToken,
      account.gmailHistoryId
    );

    if (latestHistoryId) {
      await User.findOneAndUpdate(
        { _id: user._id, 'connectedAccounts._id': account._id },
        { $set: { 'connectedAccounts.$.gmailHistoryId': latestHistoryId } }
      );
    }

    if (messages.length === 0) return;

    // Build a map of threadId -> { campaignId, jobId, recipientEmail }
    const threadIds = messages.map((m) => m.threadId);
    const campaigns = await Campaign.find({
      user_id: user._id,
      $or: threadIds.map((tid) => ({ [`email_jobs`]: { $exists: true } })),
    });

    type ThreadMatch = { campaignId: string; jobId: string; recipientEmail: string };
    const threadMap = new Map<string, ThreadMatch>();

    for (const campaign of campaigns) {
      const jobs = campaign.email_jobs as Record<string, EmailJob>;
      for (const [jobId, job] of Object.entries(jobs)) {
        if (job.threadId && threadIds.includes(job.threadId)) {
          threadMap.set(job.threadId, {
            campaignId: campaign._id.toString(),
            jobId,
            recipientEmail: job.recipientData['Email'] ?? '',
          });
        }
      }
    }

    for (const msg of messages) {
      const match = threadMap.get(msg.threadId);
      if (!match) continue;

      const exists = await Reply.findOne({ replyMessageId: msg.id });
      if (exists) continue;

      const snippet = await fetchMessageSnippet(account.accessToken, msg.id);

      await Reply.create({
        campaignId: match.campaignId,
        jobId: match.jobId,
        recipientEmail: match.recipientEmail,
        threadId: msg.threadId,
        replyMessageId: msg.id,
        snippet,
        receivedAt: new Date(),
        isRead: false,
        userId: user._id,
      });

      logger.info('Reply saved', { replyMessageId: msg.id, recipientEmail: match.recipientEmail });
    }
  } catch (err: any) {
    logger.error('Error processing Pub/Sub webhook', { error: err.message });
  }
};
```

- [ ] **Step 2: Commit**
```bash
git add backend/controllers/pubsub-webhook.controller.ts
git commit -m "feat: add Pub/Sub webhook controller for reply detection"
```

---

## Task 8: Tạo reply.controller.ts + routers

**Files:**
- Create: `backend/controllers/reply.controller.ts`
- Create: `backend/routers/pubsub.router.ts`
- Create: `backend/routers/reply.router.ts`
- Modify: `backend/routers/index.ts`

- [ ] **Step 1: Tạo reply.controller.ts**

```ts
import { Request, Response, NextFunction } from 'express';
import Reply from '../models/reply.model';

export const getReplies = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { unread, campaignId } = req.query;

    const filter: Record<string, unknown> = { userId };
    if (unread === 'true') filter.isRead = false;
    if (campaignId) filter.campaignId = campaignId;

    const replies = await Reply.find(filter)
      .sort({ receivedAt: -1 })
      .limit(50)
      .populate('campaignId', 'name');

    res.json(replies);
  } catch (err) {
    next(err);
  }
};

export const markReplyRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).userId;

    await Reply.findOneAndUpdate({ _id: id, userId }, { isRead: true });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
```

- [ ] **Step 2: Tạo pubsub.router.ts**

```ts
import express from 'express';
import { handlePubSubWebhook } from '../controllers/pubsub-webhook.controller';

const router = express.Router();

router.post('/gmail', handlePubSubWebhook);

export default router;
```

- [ ] **Step 3: Tạo reply.router.ts**

```ts
import express from 'express';
import verifyToken from '../middleware/verify-token';
import { getReplies, markReplyRead } from '../controllers/reply.controller';

const router = express.Router();

router.get('/', verifyToken, getReplies);
router.patch('/:id/read', verifyToken, markReplyRead);

export default router;
```

- [ ] **Step 4: Đăng ký routes trong index.ts**

Tìm:
```ts
import authRoutes from './auth.route';
import emailRoutes from './email.route';
import campaignRoutes from './campaign.route';
import signatureRoutes from './signature.route';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/email', emailRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/signatures', signatureRoutes);
```

Thay bằng:
```ts
import authRoutes from './auth.route';
import emailRoutes from './email.route';
import campaignRoutes from './campaign.route';
import signatureRoutes from './signature.route';
import replyRoutes from './reply.router';
import pubsubRoutes from './pubsub.router';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/email', emailRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/signatures', signatureRoutes);
router.use('/replies', replyRoutes);
router.use('/webhooks', pubsubRoutes);
```

- [ ] **Step 5: Commit**
```bash
git add backend/controllers/reply.controller.ts backend/routers/pubsub.router.ts backend/routers/reply.router.ts backend/routers/index.ts
git commit -m "feat: add reply and pubsub webhook routes"
```

---

## Task 9: Gọi setupGmailWatch khi gửi campaign đầu tiên

**Files:**
- Modify: `backend/worker/consumer.ts`

- [ ] **Step 1: Import và gọi setupGmailWatch sau khi gửi thành công, nếu account chưa có watch**

Thêm import ở đầu file:
```ts
import { setupGmailWatch } from '../services/gmail-watch.service';
```

Sau block `await updateJobStatus(campaignId, jobId, { status: 'sent', ... });`, thêm:
```ts
      // Setup Gmail watch nếu account chưa có (hoặc đã expire)
      const freshUser = await User.findById(user._id);
      if (freshUser) {
        const activeAcc = freshUser.connectedAccounts.find(
          (a: any) => a._id.toString() === freshUser.activeAccountId?.toString() && a.provider === 'gmail'
        );
        if (activeAcc && (!activeAcc.gmailWatchExpiry || activeAcc.gmailWatchExpiry < new Date())) {
          await setupGmailWatch(
            freshUser._id.toString(),
            activeAcc._id.toString(),
            activeAcc.accessToken
          );
        }
      }
```

- [ ] **Step 2: Commit**
```bash
git add backend/worker/consumer.ts
git commit -m "feat: auto setup Gmail watch after first successful send"
```

---

## Task 10: Cron job renew watch

**Files:**
- Create: `backend/worker/watch-renewer.ts`
- Modify: `backend/worker/index.ts`

- [ ] **Step 1: Xem nội dung `backend/worker/index.ts`**

```bash
cat backend/worker/index.ts
```

- [ ] **Step 2: Tạo watch-renewer.ts**

```ts
import { renewExpiringWatches } from '../services/gmail-watch.service';
import logger from '../utils/wiston-log';

const SIX_DAYS_MS = 6 * 24 * 60 * 60 * 1000;

export const startWatchRenewer = (): void => {
  const run = async () => {
    try {
      await renewExpiringWatches();
    } catch (err: any) {
      logger.error('Watch renewer error', { error: err.message });
    }
  };

  run(); // run immediately on start
  setInterval(run, SIX_DAYS_MS);
};
```

- [ ] **Step 3: Gọi `startWatchRenewer` trong `backend/worker/index.ts`**

Thêm vào cuối phần khởi tạo worker (sau `startConsumer`):
```ts
import { startWatchRenewer } from './watch-renewer';
// ...
startWatchRenewer();
```

- [ ] **Step 4: Commit**
```bash
git add backend/worker/watch-renewer.ts backend/worker/index.ts
git commit -m "feat: add cron job to renew Gmail watch before expiry"
```

---

## Task 11: Frontend — replyApi và useReplies hook

**Files:**
- Create: `frontend/src/features/reply/replyApi.ts`
- Create: `frontend/src/hooks/useReplies.ts`

- [ ] **Step 1: Tạo `frontend/src/features/reply/replyApi.ts`**

Xem `frontend/src/utils/index.ts` để biết `sendRequest` signature, sau đó tạo:

```ts
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/v1';

export type Reply = {
  _id: string;
  campaignId: { _id: string; name: string } | string;
  jobId: string;
  recipientEmail: string;
  threadId: string;
  replyMessageId: string;
  snippet: string;
  receivedAt: string;
  isRead: boolean;
};

export const fetchUnreadReplies = async (): Promise<Reply[]> => {
  const res = await axios.get<Reply[]>(`${API_BASE}/replies?unread=true`, {
    withCredentials: true,
  });
  return res.data;
};

export const markReplyRead = async (id: string): Promise<void> => {
  await axios.patch(`${API_BASE}/replies/${id}/read`, {}, { withCredentials: true });
};
```

> Nếu project dùng interceptor/auth header khác, điều chỉnh theo pattern của `campaignApi.tsx`.

- [ ] **Step 2: Tạo `frontend/src/hooks/useReplies.ts`**

```ts
import { useState, useEffect, useCallback } from 'react';
import { fetchUnreadReplies, type Reply } from '@/features/reply/replyApi';

export const useReplies = () => {
  const [replies, setReplies] = useState<Reply[]>([]);

  const load = useCallback(async () => {
    try {
      const data = await fetchUnreadReplies();
      setReplies(data);
    } catch {
      // fail silently — notification is non-critical
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  return { replies, reload: load };
};
```

- [ ] **Step 3: Commit**
```bash
git add frontend/src/features/reply/replyApi.ts frontend/src/hooks/useReplies.ts
git commit -m "feat: add reply API and useReplies polling hook"
```

---

## Task 12: Frontend — NotificationBell component

**Files:**
- Create: `frontend/src/components/NotificationBell.tsx`

- [ ] **Step 1: Tạo component**

```tsx
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useReplies } from '@/hooks/useReplies';
import { markReplyRead } from '@/features/reply/replyApi';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

export const NotificationBell = () => {
  const { replies, reload } = useReplies();
  const navigate = useNavigate();
  const unreadCount = replies.length;

  const handleClick = async (replyId: string, campaignId: string) => {
    await markReplyRead(replyId);
    reload();
    const cid = typeof campaignId === 'string' ? campaignId : (campaignId as any)._id;
    navigate(`/campaigns/${cid}`);
  };

  const getCampaignName = (reply: (typeof replies)[0]) => {
    if (typeof reply.campaignId === 'string') return 'Campaign';
    return reply.campaignId.name;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-medium">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {replies.length === 0 ? (
          <div className="py-4 text-center text-sm text-muted-foreground">
            No new replies
          </div>
        ) : (
          replies.map((reply) => (
            <DropdownMenuItem
              key={reply._id}
              className="flex flex-col items-start gap-1 p-3 cursor-pointer"
              onClick={() => handleClick(reply._id, reply.campaignId as string)}
            >
              <div className="flex w-full justify-between">
                <span className="text-sm font-medium truncate max-w-[180px]">
                  {reply.recipientEmail}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(reply.receivedAt), { addSuffix: true })}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {getCampaignName(reply)}
              </span>
              {reply.snippet && (
                <span className="text-xs text-muted-foreground line-clamp-2">
                  {reply.snippet}
                </span>
              )}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
```

- [ ] **Step 2: Kiểm tra `date-fns` đã được cài chưa**

```bash
cat frontend/package.json | grep date-fns
```

Nếu chưa có:
```bash
cd frontend && npm install date-fns
```

- [ ] **Step 3: Commit**
```bash
git add frontend/src/components/NotificationBell.tsx
git commit -m "feat: add NotificationBell component with unread badge and dropdown"
```

---

## Task 13: Tích hợp NotificationBell vào Header

**Files:**
- Modify: `frontend/src/components/layout/Header.tsx`

- [ ] **Step 1: Thêm import**

Thêm vào đầu file Header.tsx:
```tsx
import { NotificationBell } from '@/components/NotificationBell';
```

- [ ] **Step 2: Thêm `<NotificationBell />` vào JSX**

Tìm phần render buttons trong Header (nơi có Moon/Sun và User icon). Thêm `<NotificationBell />` trước hoặc sau theme toggle button:

```tsx
<NotificationBell />
```

Ví dụ nếu hiện tại là:
```tsx
<Button variant="ghost" size="icon" onClick={toggleTheme}>
  {theme === 'dark' ? <Sun ... /> : <Moon ... />}
</Button>
```

Thêm ngay trước nó:
```tsx
<NotificationBell />
<Button variant="ghost" size="icon" onClick={toggleTheme}>
  {theme === 'dark' ? <Sun ... /> : <Moon ... />}
</Button>
```

- [ ] **Step 3: Chạy frontend và kiểm tra bell icon xuất hiện trong header**

```bash
cd frontend && npm run dev
```

Mở browser, kiểm tra header có bell icon, click thấy dropdown "No new replies".

- [ ] **Step 4: Commit**
```bash
git add frontend/src/components/layout/Header.tsx
git commit -m "feat: add NotificationBell to Header"
```

---

## Task 14: End-to-end test thủ công

- [ ] **Step 1: Chạy ngrok và cập nhật Pub/Sub subscription endpoint**

```bash
ngrok http 3000
```

Copy URL dạng `https://xxxx.ngrok-free.app` → vào Google Cloud Console → Pub/Sub → Subscriptions → `rapid-mail-push-sub-push` → Edit → cập nhật endpoint thành `https://xxxx.ngrok-free.app/api/webhooks/gmail` → Save.

- [ ] **Step 2: Khởi động backend và worker**

```bash
cd backend && npm run dev
```

- [ ] **Step 3: Gửi một campaign test đến email mà bạn có thể reply**

1. Tạo campaign với 1 recipient là email bạn kiểm soát
2. Gửi campaign
3. Kiểm tra log backend: tìm `Gmail watch setup` và `threadId` được lưu vào job

- [ ] **Step 4: Reply email từ recipient**

Reply email nhận được từ một email account khác.

- [ ] **Step 5: Kiểm tra webhook nhận được**

Trong log backend tìm: `Reply saved` với recipientEmail tương ứng.

- [ ] **Step 6: Kiểm tra notification bell trên frontend**

Bell icon hiển thị badge số 1, click dropdown thấy reply với snippet và campaign name.
