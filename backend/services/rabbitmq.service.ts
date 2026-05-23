import amqp from 'amqplib';
import settings from '../config/env';
import logger from '../utils/wiston-log';

const EXCHANGE = 'email.delayed';
const QUEUE = 'email.queue';
const ROUTING_KEY = 'email';
const DLQ = 'email.dlq';

let connection: amqp.ChannelModel | null = null;
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
