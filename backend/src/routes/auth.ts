import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { logger } from '../config/logger';

export interface AuthRequest extends Request {
  userId?: string;
  orgId?: string;
}

/**
 * JWT authentication middleware (minimal MVP)
 */
export function authenticate(req: AuthRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // For MVP, allow unauthenticated requests but mark as anonymous
    req.userId = undefined;
    req.orgId = undefined;
    return next();
  }

  try {
    const token = authHeader.substring(7);
    if (!config.JWT_SECRET) {
      req.userId = undefined;
      req.orgId = undefined;
      return next();
    }
    const decoded = jwt.verify(token, config.JWT_SECRET) as { userId: string; orgId: string };
    req.userId = decoded.userId;
    req.orgId = decoded.orgId;
    next();
  } catch (error) {
    logger.warn('JWT verification failed', { error });
    req.userId = undefined;
    req.orgId = undefined;
    next(); // Still allow, but unauthenticated
  }
}

/**
 * Admin key authentication
 */
export function adminAuth(req: Request, res: Response, next: NextFunction): void {
  const adminKey = req.headers['x-admin-key'];
  
  if (!adminKey || !config.ADMIN_KEY || adminKey !== config.ADMIN_KEY) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  
  next();
  return;
}
