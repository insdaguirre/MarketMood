import { Request, Response, NextFunction } from 'express';
import { Redis } from 'ioredis';
import { redis } from '../db/redis';
import { logger } from './logger';

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
}

export function createRateLimiter(options: RateLimitOptions) {
  const {
    windowMs,
    maxRequests,
    keyGenerator = (req) => `rate_limit:${req.ip}`,
    skipSuccessfulRequests = false,
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = keyGenerator(req);
      const window = Math.floor(Date.now() / windowMs);
      const rateLimitKey = `${key}:${window}`;

      const current = await redis.incr(rateLimitKey);
      await redis.expire(rateLimitKey, Math.ceil(windowMs / 1000));

      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - current));

      if (current > maxRequests) {
        logger.warn({ key, current, maxRequests }, 'Rate limit exceeded');
        return res.status(429).json({
          error: 'Too many requests',
          retryAfter: windowMs / 1000,
        });
      }

      // Track successful requests if needed
      if (skipSuccessfulRequests) {
        const originalSend = res.send;
        res.send = function (body) {
          if (res.statusCode < 400) {
            redis.decr(rateLimitKey);
          }
          return originalSend.call(this, body);
        };
      }

      next();
    } catch (error) {
      logger.error({ error }, 'Rate limiter error');
      // Fail open - allow request if Redis is down
      next();
    }
  };
}

// Pre-configured rate limiters
export const rateLimiters = {
  ask: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60,
  }),
  sentiment: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 120,
  }),
};
