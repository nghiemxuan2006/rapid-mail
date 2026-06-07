# Campaign Reply Notifications — Design Spec

**Date:** 2026-06-07  
**Status:** Approved

## Overview

Khi recipient reply lại email được gửi qua campaign, user sẽ thấy notification trong app (icon bell ở Header). Click vào notification sẽ hiển thị danh sách reply theo từng recipient, kèm preview nội dung.

## Architecture

```
Gmail (recipient replies)
       │
       ▼
Google Cloud Pub/Sub topic (rapid-mail-push)
       │ push
       ▼
Backend webhook POST /api/webhooks/gmail
       │
       ├── gmail.users.history.list(startHistoryId)
       ├── filter threadId khớp với campaign email_jobs
       └── lưu Reply document vào MongoDB
              │
              ▼
       Frontend polls GET /api/replies?unread=true
              │
              ▼
       Notification bell ở Header
```

**Flow:**
1. Khi gửi email thành công qua Gmail API, lưu `threadId` + `messageId` vào `email_jobs`
2. Khi user kết nối Gmail account hoặc lần đầu gửi campaign, gọi `gmail.users.watch()` → Gmail đăng ký push lên Pub/Sub topic
3. Khi recipient reply, Gmail push notification đến webhook backend (ngrok trong dev, domain thật trong prod)
4. Backend nhận webhook → decode payload → gọi `history.list` từ `historyId` lần trước → lọc message trong thread của campaign
5. Lưu reply vào DB
6. Frontend poll `/api/replies` để cập nhật badge + dropdown

## Data Model

### EmailJob (thay đổi)

```ts
export type EmailJob = {
  recipientData: Record<string, string>;
  status: EmailJobStatus;
  scheduledAt: Date;
  sentAt: Date | null;
  error: string | null;
  retryCount: number;
  threadId: string | null;   // thêm mới
  messageId: string | null;  // thêm mới
  createdAt: Date;
  updatedAt: Date;
};
```

### Reply model (mới)

```ts
{
  campaignId: ObjectId,        // ref Campaign
  jobId: string,               // key trong email_jobs map
  recipientEmail: string,
  threadId: string,
  replyMessageId: string,      // Gmail messageId của reply
  snippet: string,             // preview text (tối đa 200 chars)
  receivedAt: Date,
  isRead: boolean,             // user đã click xem chưa
  userId: ObjectId,            // ref User (để query nhanh)
}
```

### User connectedAccounts (thay đổi)

Thêm 2 fields vào mỗi connected account object:

```ts
gmailWatchExpiry: Date | null,   // watch hết hạn sau 7 ngày, cần renew
gmailHistoryId: string | null,   // historyId từ lần xử lý cuối
```

## Components mới

### Backend

| File | Mục đích |
|------|----------|
| `services/gmail-watch.service.ts` | Setup/renew `gmail.users.watch()`, lưu watchExpiry + historyId |
| `controllers/pubsub-webhook.controller.ts` | Nhận POST từ Pub/Sub, decode, gọi history.list, lưu reply |
| `models/reply.model.ts` | Mongoose model cho Reply |
| `routers/pubsub.router.ts` | Route `POST /api/webhooks/gmail` (không cần auth middleware) |
| `routers/reply.router.ts` | Route `GET /api/replies` (cần auth) |
| `worker/watch-renewer.ts` | Cron job chạy mỗi 6 ngày, renew watch cho account sắp hết hạn |

### Frontend

| Component | Mục đích |
|-----------|----------|
| `Header` (cập nhật) | Thêm notification bell icon, badge số unread |
| `NotificationDropdown` | Dropdown list reply: recipient email + campaign name + snippet + thời gian |
| `useReplies` hook | Poll `GET /api/replies?unread=true` mỗi 30 giây khi user online |

Click vào một notification → navigate đến campaign detail, đánh dấu reply đó là read (`PATCH /api/replies/:id/read`).

## API Endpoints

```
POST /api/webhooks/gmail          # Pub/Sub push (no auth)
GET  /api/replies                 # lấy replies của user, query: ?unread=true&campaignId=xxx
PATCH /api/replies/:id/read       # đánh dấu đã đọc
```

## Gmail Watch — Lifecycle

- `watch()` được gọi khi: user kết nối Gmail account lần đầu, hoặc khi gửi campaign đầu tiên
- Watch hết hạn sau **7 ngày** — cron job renew mỗi **6 ngày** để an toàn
- Mỗi lần nhận webhook thành công, cập nhật `gmailHistoryId` để lần sau biết điểm bắt đầu

## Google Cloud Setup (đã hoàn thành)

- [x] Pub/Sub topic: `rapid-mail-push`
- [x] Subscription: `rapid-mail-push-sub-push` (Push delivery)
- [x] Cấp quyền `gmail-api-push@system.gserviceaccount.com` làm Pub/Sub Publisher
- [x] Env vars: `GOOGLE_PUBSUB_TOPIC`, `GMAIL_WEBHOOK_SECRET`
- [ ] Cập nhật subscription endpoint URL sau khi có ngrok URL

## Dev Workflow

1. Chạy `ngrok http <backend-port>`
2. Copy ngrok URL → cập nhật Push subscription endpoint trên Google Cloud Console
3. Restart backend
4. Gửi test campaign → reply từ email khác → verify notification xuất hiện

## Out of Scope

- Email notification (digest) — chỉ làm in-app
- Real-time WebSocket — dùng polling 30s
- Reply trong app (chỉ xem, không reply lại từ app)
