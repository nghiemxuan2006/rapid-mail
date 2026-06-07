import { connectRabbitMQ } from '../services/rabbitmq.service';
import connectMongoDB from '../config/mongodb';
import logger from '../utils/wiston-log';
import { startConsumer } from './consumer';
import { startWatchRenewer } from './watch-renewer';

const MAX_RETRIES = 3;

const start = async () => {
  logger.info('Worker starting...');

  await connectMongoDB();
  logger.info('Worker: MongoDB connected');

  await connectRabbitMQ();
  logger.info('Worker: RabbitMQ connected');

  await startConsumer(MAX_RETRIES);
  logger.info('Worker: consumer started, waiting for messages...');

  startWatchRenewer();
  logger.info('Worker: watch renewer started');
};

start().catch((err) => {
  logger.error('Worker failed to start', { err });
  process.exit(1);
});
