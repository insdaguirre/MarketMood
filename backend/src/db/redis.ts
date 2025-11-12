import Redis from 'ioredis';
import { config } from '../config/env';
import { logger } from '../config/logger';

let redisClient: Redis | null = null;

export function getRedis(): Redis {
  if (!redisClient) {
    if (!config.REDIS_URL) {
      // Don't throw - allow app to run without Redis (graceful degradation)
      logger.warn('REDIS_URL is not configured - Redis features will be disabled');
      // Create a mock Redis client that fails gracefully
      return null as any;
    }
    try {
      redisClient = new Redis(config.REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        lazyConnect: true, // Don't connect immediately
        enableOfflineQueue: false, // Don't queue commands when offline
      });

      redisClient.on('connect', () => {
        logger.debug('Redis connection established');
      });

      redisClient.on('error', (err) => {
        logger.error('Redis connection error', { error: err });
      });

      // Try to connect, but don't block if it fails
      redisClient.connect().catch((err) => {
        logger.warn('Redis initial connection failed - continuing without Redis', { error: err });
      });
    } catch (error) {
      logger.warn('Failed to create Redis client - continuing without Redis', { error });
      return null as any;
    }
  }

  return redisClient;
}

// Lazy initialization - only create when first accessed
let _redis: Redis | null = null;
export const redis = {
  get: async (key: string) => {
    if (!_redis) _redis = getRedis();
    if (!_redis || !config.REDIS_URL) return null;
    try {
      return await _redis.get(key);
    } catch (error) {
      logger.warn('Redis get failed', { error, key });
      return null;
    }
  },
  setex: async (key: string, seconds: number, value: string) => {
    if (!_redis) _redis = getRedis();
    if (!_redis || !config.REDIS_URL) return;
    try {
      await _redis.setex(key, seconds, value);
    } catch (error) {
      logger.warn('Redis setex failed', { error, key });
    }
  },
  incr: async (key: string) => {
    if (!_redis) _redis = getRedis();
    if (!_redis || !config.REDIS_URL) return 1; // Return 1 to allow requests through
    try {
      return await _redis.incr(key);
    } catch (error) {
      logger.warn('Redis incr failed', { error, key });
      return 1;
    }
  },
  expire: async (key: string, seconds: number) => {
    if (!_redis) _redis = getRedis();
    if (!_redis || !config.REDIS_URL) return;
    try {
      await _redis.expire(key, seconds);
    } catch (error) {
      logger.warn('Redis expire failed', { error, key });
    }
  },
  decr: async (key: string) => {
    if (!_redis) _redis = getRedis();
    if (!_redis || !config.REDIS_URL) return;
    try {
      await _redis.decr(key);
    } catch (error) {
      logger.warn('Redis decr failed', { error, key });
    }
  },
} as any;

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis connection closed');
  }
}
