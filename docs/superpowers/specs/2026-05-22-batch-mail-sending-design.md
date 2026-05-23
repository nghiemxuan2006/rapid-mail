# Batch Mail Sending — Design Spec

**Date:** 2026-05-22  
**Status:** Approved

---

## 1. Tổng quan

Hệ thống gửi batch mail hỗ trợ 3 chế độ:

| Mode | Mô tả |
|---|---|
| `now` | Gửi ngay lập tức cho tất cả recipient |
| `schedule_all` | Gửi toàn bộ campaign vào một thời điểm cố định |
| `schedule_individual` | Mỗi recipient được gửi vào thời điểm riêng |

Mỗi email được personalize riêng theo data của từng recipient. Hệ thống track trạng thái ở cả campaign-level và per-recipient level.

---

## 2. Kiến trúc

```
┌─────────────┐     HTTP      ┌─────────────────────┐
│  Frontend   │ ──────────── │  Express API Server  │
│  (React/TS) │              │  (existing backend)  │
└─────────────┘              └─────────┬────────────┘
                                       │ publish
                                       ▼
                             ┌─────────────────────┐
                             │      RabbitMQ        │
                             │  delayed-exchange    │
                             │  (plugin)            │
                             │  + email.queue       │
                             └─────────┬────────────┘
                                       │ consume
                                       ▼
                             ┌─────────────────────┐
                             │   Worker Service     │
                             │  (Node.js riêng)     │
                             │  - consume queue     │
                             │  - call Gmail API    │
                             │  - update job status │
                             └─────────┬────────────┘
                                       │ read/write
                                       ▼
                             ┌─────────────────────┐
                             │      MongoDB         │
                             │  campaigns           │
                             └─────────────────────┘
```

**Thành phần mới:**
- `email_jobs` field trong Campaign document
- RabbitMQ với plugin `rabbitmq_delayed_message_exchange`
- Worker Service — Node.js process riêng, độc lập với HTTP server

---

## 3. Data Model

### Campaign (mở rộng)

```ts
{
  _id: ObjectId,
  user_id: ObjectId,
  name: string,
  subject: string,
  content: string,
  recipients: object[],        // raw data, dùng khi draft
  attachments: object[],
  status: 'draft' | 'sending' | 'completed' | 'failed',
  sendMode: 'now' | 'schedule_all' | 'schedule_individual' | null,

  email_jobs: {
    [job_id: string]: {
      recipientData: object,   // full recipient row để personalize
      status: 'pending' | 'sent' | 'failed' | 'cancelled',
      scheduledAt: Date,       // send now = thời điểm tạo job
      sentAt: Date | null,
      error: string | null,
      retryCount: number,
      createdAt: Date,
      updatedAt: Date,
    }
  }
}
```

**Lưu ý:**
- `recipients` array giữ nguyên để FE hiển thị khi draft (trước khi có `email_jobs`)
- `email_jobs` được populate khi user gửi campaign
- `job_id` là UUID v4 được generate phía API server khi tạo job
- MongoDB document limit 16MB — đủ cho số lượng recipient thông thường

### RabbitMQ Message Payload

```ts
{
  campaignId: string,
  jobId: string,
}
```

Payload nhỏ, worker tự query MongoDB để lấy đầy đủ data.

---

## 4. Workflow

### 4.1 Send Now

```
FE → POST /v1/campaigns/:id/send { sendMode: "now" }
API:
  1. Update campaign.status = "sending", campaign.sendMode = "now"
  2. Với mỗi recipient trong campaign.recipients:
     - Tạo jobId (UUID v4)
     - Thêm vào campaign.email_jobs[jobId] = { recipientData, status: "pending", scheduledAt: now, ... }
     - Publish message { campaignId, jobId } lên RabbitMQ với x-delay = 0
  3. Save campaign
  4. Response 200 { message: "queued" }

Worker (khi nhận message):
  1. Query campaign by campaignId
  2. Đọc email_jobs[jobId] → lấy recipientData, check status != "cancelled"
  3. Query user → lấy Gmail credentials, signature
  4. Personalize content theo recipientData
  5. Gọi Gmail API
  6. Update email_jobs[jobId].status = "sent" | "failed"
  7. Check nếu tất cả jobs xong → update campaign.status = "completed" | "failed"
```

### 4.2 Schedule All

Giống Send Now, khác:
- FE gửi thêm `scheduledAt: Date`
- API publish mỗi message với `x-delay = scheduledAt - now` (ms)
- Tất cả job có cùng `scheduledAt`

### 4.3 Schedule Individual

- FE gửi `recipients` array, mỗi recipient có field `_scheduledAt: Date`
- API đọc `recipient._scheduledAt` cho từng người, publish với `x-delay = recipient._scheduledAt - now`
- Mỗi message đến broker ở thời điểm khác nhau

---

## 5. RabbitMQ Setup

```
Exchange: email.delayed
  type: x-delayed-message
  arguments: { x-delayed-type: "direct" }

Queue: email.queue
  durable: true
  arguments:
    x-dead-letter-exchange: email.dlq   // dead letter queue

Queue: email.dlq
  durable: true
  (nhận message sau max retry, dùng để debug)

Binding: email.delayed → email.queue (routing key: "email")
```

**Plugin cần cài:** `rabbitmq_delayed_message_exchange`

---

## 6. Error Handling & Retry

```
Khi Gmail API lỗi:
  1. Update email_jobs[jobId].error, tăng retryCount
  2. Nếu retryCount < 3:
     - Re-publish message với x-delay = 5 phút × retryCount
  3. Nếu retryCount >= 3:
     - Update status = "failed" vĩnh viễn
     - Message bị reject → vào Dead Letter Queue

Campaign status khi tất cả jobs xong:
  - Tất cả "sent"          → campaign.status = "completed"
  - Tất cả "failed"        → campaign.status = "failed"
  - Mix "sent" + "failed"  → campaign.status = "completed" (FE hiển thị warning)
```

---

## 7. Cancel Campaign

User có thể cancel campaign khi còn job `pending`:

```
POST /v1/campaigns/:id/cancel
  → Update tất cả email_jobs với status "pending" → "cancelled"
  → Update campaign.status = "draft" (hoặc giữ trạng thái cũ tùy UX)

Worker khi consume job bị cancel:
  → Check email_jobs[jobId].status == "cancelled" → ACK và bỏ qua
```

---

## 8. API Endpoints

### POST `/v1/campaigns/:id/send`

Request body:
```ts
// Send now
{ sendMode: "now" }

// Schedule all
{ sendMode: "schedule_all", scheduledAt: "2026-05-23T09:00:00Z" }

// Schedule individual (recipients đã có _scheduledAt)
{ sendMode: "schedule_individual" }
```

Response: `200 { message: "queued" }`

---

### POST `/v1/campaigns/:id/cancel`

Response: `200 { message: "cancelled" }`

---

### GET `/v1/campaigns/:id/status`

Response:
```json
{
  "status": "sending",
  "sendMode": "schedule_individual",
  "summary": {
    "total": 100,
    "sent": 45,
    "failed": 2,
    "pending": 53,
    "cancelled": 0
  },
  "jobs": {
    "<jobId>": {
      "status": "sent",
      "scheduledAt": "2026-05-23T09:00:00Z",
      "sentAt": "2026-05-23T09:00:05Z",
      "error": null,
      "retryCount": 0
    }
  }
}
```

---

## 9. Worker Service

Worker là một Node.js process riêng, deploy độc lập với Express API server.

```
worker/
  index.ts          — entry point, kết nối RabbitMQ + MongoDB
  consumer.ts       — consume queue, điều phối xử lý
  email-sender.ts   — gọi Gmail API (tái sử dụng logic từ email.service.ts)
  job-updater.ts    — update campaign.email_jobs status
```

**Scaling:** Chạy nhiều worker instance để tăng throughput. RabbitMQ tự phân phối message (competing consumers pattern).

---

## 10. Deprecated

`POST /v1/emails/send` — deprecated, thay bằng `POST /v1/campaigns/:id/send`.
