# Batch Mail Sending Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm chức năng gửi batch emails theo 3 chế độ (send now, schedule all, schedule individual) sử dụng Gmail API và RabbitMQ với delayed message exchange plugin.

**Architecture:** API Server nhận request, tạo email_jobs trong Campaign document, publish message lên RabbitMQ delayed exchange. Worker Service riêng consume queue, gọi Gmail API, cập nhật job status. Campaign và mỗi job đều được track trạng thái độc lập.

**Tech Stack:** amqplib, uuid, RabbitMQ (rabbitmq_delayed_message_exchange plugin), MongoDB (Mongoose Mixed type cho email_jobs), Node.js Worker process, tsx

---

## File Structure

**Modified:**
- `backend/docker-compose.yml` — thêm RabbitMQ service
- `backend/config/env.ts` — thêm `RABBITMQ_URL`
- `backend/models/campaign.model.ts` — thêm `status`, `sendMode`, `email_jobs`
- `backend/schema/campaign.schema.ts` — thêm Zod types mới
- `backend/routers/campaign.route.ts` — thêm 3 routes mới
- `backend/package.json` — thêm amqplib, uuid, worker script

**Created:**
- `backend/schema/send.schema.ts` — Zod schemas cho send/cancel request
- `backend/services/rabbitmq.service.ts` — kết nối RabbitMQ + publish message
- `backend/controllers/campaign-send.controller.ts` — handlers cho send, cancel, status
- `backend/worker/index.ts` — entry point của Worker Service
- `backend/worker/consumer.ts` — consume queue + xử lý job

---

## Task 1: RabbitMQ Docker Setup

**Files:**
- Modify: `backend/docker-compose.yml`
- Create: `backend/rabbitmq/enabled_plugins`

- [ ] **Step 1: Tạo file enabled_plugins**

Tạo file `backend/rabbitmq/enabled_plugins` với nội dung:
```
[rabbitmq_management,rabbitmq_delayed_message_exchange].
```

- [ ] **Step 2: Thêm RabbitMQ vào docker-compose.yml**

Thay toàn bộ nội dung `backend/docker-compose.yml`:
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7
    container_name: rapid-mail-mongodb
    restart: unless-stopped
    env_file:
      - .env.test
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
      - mongodb_config:/data/configdb
    networks:
      - rapid-mail-network
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/test --quiet
      interval: 10s
      timeout: 5s
      retries: 5

  rabbitmq:
    image: rabbitmq:3-management
    container_name: rapid-mail-rabbitmq
    restart: unless-stopped
    ports:
      - "5672:5672"
      - "15672:15672"
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
      - ./rabbitmq/enabled_plugins:/etc/rabbitmq/enabled_plugins
      - ./rabbitmq/plugins:/opt/rabbitmq/plugins
    networks:
      - rapid-mail-network
    healthcheck:
      test: rabbitmq-diagnostics -q ping
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: rapid-mail-backend
    restart: unless-stopped
    ports:
      - "3000:3000"
    env_file:
      - .env.test
    environment:
      - FILE_STORAGE_PATH=/data/rapid-mail
    depends_on:
      mongodb:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
    volumes:
      - rapid_mail_data:/data/rapid-mail
    networks:
      - rapid-mail-network
    command: npm start

volumes:
  mongodb_data:
    driver: local
  mongodb_config:
    driver: local
  rabbitmq_data:
    driver: local
  rapid_mail_data:
    driver: local

networks:
  rapid-mail-network:
    driver: bridge
```

- [ ] **Step 3: Download delayed message exchange plugin**

Tạo thư mục `backend/rabbitmq/plugins/` và download plugin phù hợp với RabbitMQ 3.x:
```bash
mkdir -p backend/rabbitmq/plugins
# Download từ: https://github.com/rabbitmq/rabbitmq-delayed-message-exchange/releases
# Chọn file .ez phù hợp với version RabbitMQ đang dùng (3.13.x)
# Đặt vào backend/rabbitmq/plugins/
```

- [ ] **Step 4: Start RabbitMQ và verify**

```bash
cd backend
docker-compose up rabbitmq -d
```

Mở `http://localhost:15672` (user: `guest`, pass: `guest`), vào tab **Exchanges**, kiểm tra có thể tạo exchange type `x-delayed-message`.

- [ ] **Step 5: Commit**

```bash
git add backend/docker-compose.yml backend/rabbitmq/
git commit -m "infra: add RabbitMQ with delayed message exchange plugin"
```

---

## Task 2: Install Dependencies + Update env config

**Files:**
- Modify: `backend/package.json`
- Modify: `backend/config/env.ts`

- [ ] **Step 1: Install amqplib và uuid**

```bash
cd backend
npm install amqplib uuid
npm install --save-dev @types/amqplib @types/uuid
```

- [ ] **Step 2: Thêm RABBITMQ_URL vào env config**

Sửa `backend/config/env.ts`:
```ts
const settings = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT || 3000,
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/dating-app',
    JWT_SECRET_KEY: process.env.JWT_SECRET_KEY || 'your_jwt_secret',
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
    GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || '',
    MICROSOFT_CLIENT_ID: process.env.MICROSOFT_CLIENT_ID || '',
    MICROSOFT_CLIENT_SECRET: process.env.MICROSOFT_CLIENT_SECRET || '',
    MICROSOFT_REDIRECT_URI: process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:5173/auth/callback',
    ACCESS_TOKEN_EXPIRES_IN: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m',
    REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',
    FILE_STORAGE_PATH: process.env.FILE_STORAGE_PATH,
    RABBITMQ_URL: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
}

export default settings;
```

- [ ] **Step 3: Thêm worker script vào package.json**

Trong `backend/package.json`, thêm vào `scripts`:
```json
"worker": "tsx -r dotenv/config worker/index.ts dotenv_config_path=.env",
"worker:prod": "tsx -r dotenv/config worker/index.ts dotenv_config_path=.env.prod"
```

- [ ] **Step 4: Thêm RABBITMQ_URL vào file .env**

Mở file `.env` của backend, thêm:
```
RABBITMQ_URL=amqp://localhost:5672
```

- [ ] **Step 5: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/config/env.ts
git commit -m "feat: add amqplib, uuid dependencies and RABBITMQ_URL config"
```

---

## Task 3: Extend Campaign Model và Schema

**Files:**
- Modify: `backend/models/campaign.model.ts`
- Modify: `backend/schema/campaign.schema.ts`

- [ ] **Step 1: Định nghĩa EmailJob types trong campaign model**

Thay toàn bộ `backend/models/campaign.model.ts`:
```ts
import mongoose, { Document, Schema } from 'mongoose';
import { Campaign } from '../schema/campaign.schema';

export type EmailJobStatus = 'pending' | 'sent' | 'failed' | 'cancelled';

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

export type CampaignStatus = 'draft' | 'sending' | 'completed' | 'failed';
export type SendMode = 'now' | 'schedule_all' | 'schedule_individual';

export type CampaignDocument = Omit<Campaign, 'user_id'> & Document & {
  user_id: mongoose.Types.ObjectId;
  status: CampaignStatus;
  sendMode: SendMode | null;
  email_jobs: Record<string, EmailJob>;
  createdAt: Date;
  updatedAt: Date;
};

const AttachmentSchema = new Schema({
  filename: { type: String, required: true },
  storedName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
}, { _id: false });

const CampaignSchema = new Schema<CampaignDocument>({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  subject: { type: String, required: true },
  content: { type: String, required: true },
  recipients: { type: [Object], required: true },
  attachments: { type: [AttachmentSchema], default: [] },
  status: {
    type: String,
    enum: ['draft', 'sending', 'completed', 'failed'],
    default: 'draft',
  },
  sendMode: {
    type: String,
    enum: ['now', 'schedule_all', 'schedule_individual'],
    default: null,
  },
  email_jobs: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });

export default mongoose.model<CampaignDocument>('Campaign', CampaignSchema);
```

- [ ] **Step 2: Thêm send/cancel schema vào campaign.schema.ts**

Tạo file `backend/schema/send.schema.ts`:
```ts
import { z } from 'zod';
import { objectIdSchema } from './common.schema';

export const sendNowBodySchema = z.object({
  sendMode: z.literal('now'),
});

export const sendScheduleAllBodySchema = z.object({
  sendMode: z.literal('schedule_all'),
  scheduledAt: z.string().datetime('scheduledAt must be a valid ISO datetime'),
});

export const sendScheduleIndividualBodySchema = z.object({
  sendMode: z.literal('schedule_individual'),
  // map recipientId -> ISO datetime string
  scheduledTimes: z.record(z.string(), z.string().datetime()),
});

export const sendCampaignBodySchema = z.discriminatedUnion('sendMode', [
  sendNowBodySchema,
  sendScheduleAllBodySchema,
  sendScheduleIndividualBodySchema,
]);

export const campaignSendParamsSchema = z.object({
  id: objectIdSchema,
});

export type SendCampaignBody = z.infer<typeof sendCampaignBodySchema>;
export type CampaignSendParams = z.infer<typeof campaignSendParamsSchema>;
```

- [ ] **Step 3: Verify TypeScript compile**

```bash
cd backend
npx tsc --noEmit
```

Expected: không có lỗi.

- [ ] **Step 4: Commit**

```bash
git add backend/models/campaign.model.ts backend/schema/send.schema.ts
git commit -m "feat: extend Campaign model with status, sendMode, email_jobs fields"
```

---

## Task 4: RabbitMQ Service

**Files:**
- Create: `backend/services/rabbitmq.service.ts`

- [ ] **Step 1: Tạo rabbitmq.service.ts**

Tạo file `backend/services/rabbitmq.service.ts`:
```ts
import amqp from 'amqplib';
import settings from '../config/env';
import logger from '../utils/wiston-log';

const EXCHANGE = 'email.delayed';
const QUEUE = 'email.queue';
const ROUTING_KEY = 'email';
const DLQ = 'email.dlq';

let connection: amqp.Connection | null = null;
let publishChannel: amqp.Channel | null = null;

export const connectRabbitMQ = async (): Promise<void> => {
  connection = await amqp.connect(settings.RABBITMQ_URL);
  publishChannel = await connection.createChannel();

  await publishChannel.assertExchange(EXCHANGE, 'x-delayed-message', {
    durable: true,
    arguments: { 'x-delayed-type': 'direct' },
  });

  await publishChannel.assertQueue(DLQ, { durable: true });

  await publishChannel.assertQueue(QUEUE, {
    durable: true,
    arguments: { 'x-dead-letter-exchange': DLQ },
  });

  await publishChannel.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY);

  connection.on('error', (err) => {
    logger.error('RabbitMQ connection error', { err });
    connection = null;
    publishChannel = null;
  });

  logger.info('RabbitMQ connected');
};

export const publishEmailJob = (campaignId: string, jobId: string, delayMs: number): void => {
  if (!publishChannel) throw new Error('RabbitMQ channel not initialized');

  const payload = JSON.stringify({ campaignId, jobId });
  publishChannel.publish(EXCHANGE, ROUTING_KEY, Buffer.from(payload), {
    headers: { 'x-delay': delayMs },
    persistent: true,
  });
};

export const createConsumeChannel = async (): Promise<amqp.Channel> => {
  if (!connection) throw new Error('RabbitMQ not connected');
  const channel = await connection.createChannel();
  channel.prefetch(1);
  return channel;
};

export const getQueueName = () => QUEUE;
```

- [ ] **Step 2: Kết nối RabbitMQ trong app.ts**

Trong `backend/app.ts`, thêm import và gọi connect:
```ts
import { connectRabbitMQ } from './services/rabbitmq.service';
```

Và thêm sau `connectMongoDB()`:
```ts
connectRabbitMQ().catch((err) => {
  logger.error('Failed to connect to RabbitMQ', { err });
});
```

- [ ] **Step 3: Verify server start không lỗi**

```bash
cd backend
npm start
```

Expected log: `RabbitMQ connected` (cần RabbitMQ đang chạy).

- [ ] **Step 4: Commit**

```bash
git add backend/services/rabbitmq.service.ts backend/app.ts
git commit -m "feat: add RabbitMQ service with delayed exchange setup"
```

---

## Task 5: Send Campaign Endpoint

**Files:**
- Create: `backend/controllers/campaign-send.controller.ts`
- Modify: `backend/routers/campaign.route.ts`

- [ ] **Step 1: Tạo campaign-send.controller.ts**

Tạo file `backend/controllers/campaign-send.controller.ts`:
```ts
import { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Campaign, { EmailJob } from '../models/campaign.model';
import { publishEmailJob } from '../services/rabbitmq.service';
import { SendCampaignBody, CampaignSendParams } from '../schema/send.schema';
import { BAD_REQUEST_ERROR, NOT_FOUND_ERROR, UNAUTHORIZED_ERROR } from '../utils/error';

export const sendCampaign = async (
  req: Request<CampaignSendParams, {}, SendCampaignBody>,
  res: Response,
  next: NextFunction
) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) throw new NOT_FOUND_ERROR('Campaign not found');
    if (campaign.user_id.toString() !== req.user.sub) {
      throw new UNAUTHORIZED_ERROR('No permission');
    }
    if (campaign.status !== 'draft') {
      throw new BAD_REQUEST_ERROR('Campaign has already been sent or is currently sending');
    }
    if (!campaign.recipients || campaign.recipients.length === 0) {
      throw new BAD_REQUEST_ERROR('Campaign has no recipients');
    }

    const { sendMode } = req.body;
    const now = new Date();
    const emailJobs: Record<string, EmailJob> = {};

    for (const recipient of campaign.recipients) {
      const jobId = uuidv4();
      let scheduledAt: Date;

      if (sendMode === 'now') {
        scheduledAt = now;
      } else if (sendMode === 'schedule_all') {
        scheduledAt = new Date((req.body as { scheduledAt: string }).scheduledAt);
      } else {
        // schedule_individual
        const times = (req.body as { scheduledTimes: Record<string, string> }).scheduledTimes;
        const recipientId = recipient['id'] as string;
        if (!times[recipientId]) {
          throw new BAD_REQUEST_ERROR(`Missing scheduledAt for recipient ${recipientId}`);
        }
        scheduledAt = new Date(times[recipientId]);
      }

      emailJobs[jobId] = {
        recipientData: recipient as Record<string, string>,
        status: 'pending',
        scheduledAt,
        sentAt: null,
        error: null,
        retryCount: 0,
        createdAt: now,
        updatedAt: now,
      };

      const delayMs = Math.max(0, scheduledAt.getTime() - now.getTime());
      publishEmailJob(campaign._id.toString(), jobId, delayMs);
    }

    campaign.email_jobs = emailJobs;
    campaign.status = 'sending';
    campaign.sendMode = sendMode;
    campaign.markModified('email_jobs');
    await campaign.save();

    res.json({ message: 'queued', jobCount: Object.keys(emailJobs).length });
  } catch (error) {
    next(error);
  }
};
```

- [ ] **Step 2: Thêm routes vào campaign.route.ts**

Thêm imports vào đầu `backend/routers/campaign.route.ts`:
```ts
import { sendCampaignBodySchema, campaignSendParamsSchema } from '../schema/send.schema';
import { sendCampaign, cancelCampaign, getCampaignStatus } from '../controllers/campaign-send.controller';
```

Thêm routes (trước `export default router`):
```ts
router.post('/:id/send',
  verifyToken,
  validateRequestParams(campaignSendParamsSchema),
  validateRequestBody(sendCampaignBodySchema),
  sendCampaign
);

router.post('/:id/cancel',
  verifyToken,
  validateRequestParams(campaignSendParamsSchema),
  cancelCampaign
);

router.get('/:id/status',
  verifyToken,
  validateRequestParams(campaignSendParamsSchema),
  getCampaignStatus
);
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd backend
npx tsc --noEmit
```

Expected: không có lỗi.

- [ ] **Step 4: Test thủ công**

Dùng curl hoặc Postman:
```bash
# Send now
curl -X POST http://localhost:3000/v1/campaigns/<campaignId>/send \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"sendMode":"now"}'
```

Expected: `{"message":"queued","jobCount":<n>}`

- [ ] **Step 5: Commit**

```bash
git add backend/controllers/campaign-send.controller.ts backend/routers/campaign.route.ts
git commit -m "feat: add POST /campaigns/:id/send endpoint with 3 send modes"
```

---

## Task 6: Cancel và Status Endpoints

**Files:**
- Modify: `backend/controllers/campaign-send.controller.ts`

- [ ] **Step 1: Thêm cancelCampaign handler**

Append vào cuối `backend/controllers/campaign-send.controller.ts`:
```ts
export const cancelCampaign = async (
  req: Request<CampaignSendParams>,
  res: Response,
  next: NextFunction
) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) throw new NOT_FOUND_ERROR('Campaign not found');
    if (campaign.user_id.toString() !== req.user.sub) {
      throw new UNAUTHORIZED_ERROR('No permission');
    }
    if (campaign.status !== 'sending') {
      throw new BAD_REQUEST_ERROR('Only sending campaigns can be cancelled');
    }

    const jobs = campaign.email_jobs as Record<string, EmailJob>;
    let cancelledCount = 0;

    for (const jobId of Object.keys(jobs)) {
      if (jobs[jobId].status === 'pending') {
        jobs[jobId].status = 'cancelled';
        jobs[jobId].updatedAt = new Date();
        cancelledCount++;
      }
    }

    campaign.email_jobs = jobs;
    campaign.markModified('email_jobs');
    await campaign.save();

    res.json({ message: 'cancelled', cancelledCount });
  } catch (error) {
    next(error);
  }
};
```

- [ ] **Step 2: Thêm getCampaignStatus handler**

Append vào cuối `backend/controllers/campaign-send.controller.ts`:
```ts
export const getCampaignStatus = async (
  req: Request<CampaignSendParams>,
  res: Response,
  next: NextFunction
) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) throw new NOT_FOUND_ERROR('Campaign not found');
    if (campaign.user_id.toString() !== req.user.sub) {
      throw new UNAUTHORIZED_ERROR('No permission');
    }

    const jobs = campaign.email_jobs as Record<string, EmailJob>;
    const jobValues = Object.values(jobs);

    const summary = {
      total: jobValues.length,
      sent: jobValues.filter((j) => j.status === 'sent').length,
      failed: jobValues.filter((j) => j.status === 'failed').length,
      pending: jobValues.filter((j) => j.status === 'pending').length,
      cancelled: jobValues.filter((j) => j.status === 'cancelled').length,
    };

    res.json({
      status: campaign.status,
      sendMode: campaign.sendMode,
      summary,
      jobs,
    });
  } catch (error) {
    next(error);
  }
};
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd backend
npx tsc --noEmit
```

Expected: không có lỗi.

- [ ] **Step 4: Test cancel thủ công**

```bash
curl -X POST http://localhost:3000/v1/campaigns/<campaignId>/cancel \
  -H "Authorization: Bearer <token>"
```

Expected: `{"message":"cancelled","cancelledCount":<n>}`

- [ ] **Step 5: Commit**

```bash
git add backend/controllers/campaign-send.controller.ts
git commit -m "feat: add cancel and status endpoints for campaigns"
```

---

## Task 7: Worker Service — Entry Point

**Files:**
- Create: `backend/worker/index.ts`

- [ ] **Step 1: Tạo worker/index.ts**

Tạo file `backend/worker/index.ts`:
```ts
import { connectRabbitMQ } from '../services/rabbitmq.service';
import connectMongoDB from '../config/mongodb';
import logger from '../utils/wiston-log';
import { startConsumer } from './consumer';

const MAX_RETRIES = 3;

const start = async () => {
  logger.info('Worker starting...');

  await connectMongoDB();
  logger.info('Worker: MongoDB connected');

  await connectRabbitMQ();
  logger.info('Worker: RabbitMQ connected');

  await startConsumer(MAX_RETRIES);
  logger.info('Worker: consumer started, waiting for messages...');
};

start().catch((err) => {
  logger.error('Worker failed to start', { err });
  process.exit(1);
});
```

- [ ] **Step 2: Verify worker starts (chưa có consumer)**

Tạm thời tạo `backend/worker/consumer.ts` với stub:
```ts
export const startConsumer = async (_maxRetries: number) => {
  // placeholder
};
```

Chạy worker:
```bash
cd backend
npm run worker
```

Expected logs:
```
Worker starting...
Worker: MongoDB connected
Worker: RabbitMQ connected
Worker: consumer started, waiting for messages...
```

- [ ] **Step 3: Commit**

```bash
git add backend/worker/
git commit -m "feat: add Worker Service entry point"
```

---

## Task 8: Worker Consumer — Core Processing

**Files:**
- Modify: `backend/worker/consumer.ts`

- [ ] **Step 1: Implement consumer**

Thay toàn bộ `backend/worker/consumer.ts`:
```ts
import Campaign, { EmailJob } from '../models/campaign.model';
import { createConsumeChannel, getQueueName, publishEmailJob } from '../services/rabbitmq.service';
import { sendEmail } from '../services/email.service';
import { readFile } from '../services/file-storage.service';
import Signature from '../models/signature.model';
import User from '../models/user.model';
import logger from '../utils/wiston-log';
import { Recipient } from '../schema/common.schema';

type QueueMessage = {
  campaignId: string;
  jobId: string;
};

const processContent = (content: string, recipient: Recipient): string => {
  const fields = Object.keys(recipient);
  let result = content;
  fields.forEach((field) => {
    const value = recipient[field] || '';
    result = result.replace(new RegExp(`\\[${field}\\]`, 'g'), value || `Missing field ${field}`);
    result = result.replace(
      new RegExp(`\\{\\{${field}\\s*\\|\\|\\s*['"]([^'"]+)['"]\\}\\}`, 'g'),
      value || `Missing field ${field}`
    );
  });
  return result;
};

const updateJobStatus = async (
  campaignId: string,
  jobId: string,
  update: Partial<EmailJob>
) => {
  const setFields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(update)) {
    setFields[`email_jobs.${jobId}.${key}`] = value;
  }
  setFields[`email_jobs.${jobId}.updatedAt`] = new Date();
  await Campaign.findByIdAndUpdate(campaignId, { $set: setFields });
};

const checkAndFinalizeCampaign = async (campaignId: string) => {
  const campaign = await Campaign.findById(campaignId);
  if (!campaign) return;

  const jobs = Object.values(campaign.email_jobs as Record<string, EmailJob>);
  const allDone = jobs.every(
    (j) => j.status === 'sent' || j.status === 'failed' || j.status === 'cancelled'
  );

  if (!allDone) return;

  const hasSent = jobs.some((j) => j.status === 'sent');
  const newStatus = hasSent ? 'completed' : 'failed';
  await Campaign.findByIdAndUpdate(campaignId, { status: newStatus });
  logger.info(`Campaign ${campaignId} finalized with status: ${newStatus}`);
};

export const startConsumer = async (maxRetries: number) => {
  const channel = await createConsumeChannel();
  const queue = getQueueName();

  channel.consume(queue, async (msg) => {
    if (!msg) return;

    const { campaignId, jobId } = JSON.parse(msg.content.toString()) as QueueMessage;
    logger.info(`Processing job ${jobId} for campaign ${campaignId}`);

    try {
      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        logger.warn(`Campaign ${campaignId} not found, skipping job ${jobId}`);
        channel.ack(msg);
        return;
      }

      const jobs = campaign.email_jobs as Record<string, EmailJob>;
      const job = jobs[jobId];

      if (!job || job.status === 'cancelled') {
        logger.info(`Job ${jobId} is cancelled or missing, skipping`);
        channel.ack(msg);
        return;
      }

      const user = await User.findById(campaign.user_id);
      if (!user) throw new Error(`User not found for campaign ${campaignId}`);

      const activeAccount = user.activeAccountId
        ? (user.connectedAccounts || []).find(
            (acc: any) => acc._id.toString() === String(user.activeAccountId)
          )
        : null;
      const senderEmail = activeAccount?.email || user.email;

      const matchedSignature =
        await Signature.findOne({ userId: campaign.user_id, sourceEmail: senderEmail }).lean() ??
        await Signature.findOne({ userId: campaign.user_id, isDefault: true }).lean();
      const signature = matchedSignature?.content || '';

      const personalizedContent = processContent(campaign.content, job.recipientData as Recipient);

      let emailAttachments;
      if (campaign.attachments && campaign.attachments.length > 0) {
        emailAttachments = campaign.attachments.map((att) => ({
          filename: att.filename,
          mimeType: att.mimeType,
          content: readFile(campaignId, att.storedName),
        }));
      }

      await sendEmail({
        content: personalizedContent,
        receivers: [job.recipientData['Email']],
        user,
        subject: campaign.subject,
        signature,
        attachments: emailAttachments,
      });

      await updateJobStatus(campaignId, jobId, { status: 'sent', sentAt: new Date() });
      logger.info(`Job ${jobId} sent successfully`);

    } catch (err: any) {
      logger.error(`Job ${jobId} failed`, { error: err.message });

      const campaign = await Campaign.findById(campaignId);
      const job = (campaign?.email_jobs as Record<string, EmailJob>)?.[jobId];
      const retryCount = job?.retryCount ?? 0;

      if (retryCount < maxRetries) {
        const delayMs = 5 * 60 * 1000 * (retryCount + 1);
        await updateJobStatus(campaignId, jobId, {
          retryCount: retryCount + 1,
          error: err.message,
        });
        publishEmailJob(campaignId, jobId, delayMs);
        logger.info(`Job ${jobId} queued for retry ${retryCount + 1}/${maxRetries}`);
      } else {
        await updateJobStatus(campaignId, jobId, {
          status: 'failed',
          error: err.message,
        });
        logger.error(`Job ${jobId} permanently failed after ${maxRetries} retries`);
      }
    }

    channel.ack(msg);
    await checkAndFinalizeCampaign(campaignId);
  });
};
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd backend
npx tsc --noEmit
```

Expected: không có lỗi.

- [ ] **Step 3: Test end-to-end thủ công**

1. Start RabbitMQ: `docker-compose up rabbitmq -d`
2. Start API: `npm start`
3. Start Worker (terminal riêng): `npm run worker`
4. Gọi `POST /v1/campaigns/<id>/send` với `{"sendMode":"now"}`
5. Quan sát logs của worker: phải thấy `Job <id> sent successfully`
6. Gọi `GET /v1/campaigns/<id>/status`: kiểm tra summary và jobs status

- [ ] **Step 4: Commit**

```bash
git add backend/worker/consumer.ts
git commit -m "feat: implement Worker consumer with retry logic and campaign finalization"
```

---

## Task 9: Cleanup — Deprecate Old Email Endpoint

**Files:**
- Modify: `backend/routers/email.route.ts` (nếu tồn tại)

- [ ] **Step 1: Kiểm tra email route**

```bash
cat backend/routers/email.route.ts
```

- [ ] **Step 2: Đánh dấu deprecated**

Trong `backend/routers/email.route.ts`, thêm comment deprecation và response warning:

Tìm handler `submitCampaignEmails` và trong route, thêm middleware trước handler:
```ts
// Deprecated: use POST /campaigns/:id/send instead
const warnDeprecated: express.RequestHandler = (_req, res, _next) => {
  res.status(410).json({
    message: 'This endpoint is deprecated. Use POST /v1/campaigns/:id/send instead.',
  });
};

router.post('/send', verifyToken, warnDeprecated);
```

- [ ] **Step 3: Commit**

```bash
git add backend/routers/email.route.ts
git commit -m "feat: deprecate POST /emails/send, replaced by POST /campaigns/:id/send"
```

---

## Self-Review Checklist

- [x] **RabbitMQ setup** (Task 1) — docker-compose + plugin + enabled_plugins
- [x] **env config** (Task 2) — RABBITMQ_URL
- [x] **Campaign model** (Task 3) — status, sendMode, email_jobs (Mixed)
- [x] **Send schema** (Task 3) — discriminatedUnion cho 3 sendMode
- [x] **RabbitMQ service** (Task 4) — connect, publish, createConsumeChannel
- [x] **Send endpoint** (Task 5) — POST /:id/send, 3 modes, tạo jobs, publish
- [x] **Cancel endpoint** (Task 6) — cập nhật pending jobs → cancelled
- [x] **Status endpoint** (Task 6) — summary + per-job detail
- [x] **Worker entry point** (Task 7) — connect MongoDB + RabbitMQ + startConsumer
- [x] **Worker consumer** (Task 8) — consume, personalize, send, retry, finalize campaign
- [x] **Deprecate old endpoint** (Task 9)
