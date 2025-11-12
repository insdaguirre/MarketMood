import Redis from 'ioredis';
import { config } from '../config/env';
import { logger } from '../config/logger';

let redisClient: Redis | null = null;

export function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    redisClient.on('connect', () => {
      logger.debug('Redis connection established');
    });

    redisClient.on('error', (err) => {
      logger.error({ error: err }, 'Redis connection error');
    });
  }

  return redisClient;
}

export const redis = getRedis();

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis connection closed');
  }
}
