import express from 'express';
import { handlePubSubWebhook } from '../controllers/pubsub-webhook.controller';

const router = express.Router();

router.post('/gmail', handlePubSubWebhook);

export default router;
