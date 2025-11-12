import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env';
import { logger } from './config/logger';
import { closePool } from './db/pg';
import { closeRedis } from './db/redis';
import apiRoutes from './routes/api';
import adminRoutes from './routes/admin';

const app = express();
const PORT = config.PORT;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, _res, next) => {
  logger.info('Request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  next();
});

// Health check endpoint
app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (_req, res) => {
  res.json({ 
    service: 'MarketMood API',
    version: '1.0.0',
    endpoints: {
      health: '/healthz',
      sentiment: '/api/sentiment?ticker=AAPL',
      ask: '/api/ask (POST)',
    }
  });
});

// API routes
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
  });
  res.status(500).json({ error: 'Internal server error' });
});

// Start server - bind to 0.0.0.0 for Railway
const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(async () => {
    await closePool();
    await closeRedis();
    process.exit(0);
  });
});
