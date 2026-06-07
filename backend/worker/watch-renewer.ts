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

  run();
  setInterval(run, SIX_DAYS_MS);
};
