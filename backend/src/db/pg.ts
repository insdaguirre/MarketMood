import { Pool, PoolConfig } from 'pg';
import { config } from '../config/env';
import { logger } from '../config/logger';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const poolConfig: PoolConfig = {
      connectionString: config.POSTGRES_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

    pool = new Pool(poolConfig);

    pool.on('error', (err) => {
      logger.error({ error: err }, 'Unexpected database error');
    });

    pool.on('connect', () => {
      logger.debug('Database connection established');
    });
  }

  return pool;
}

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const result = await getPool().query(text, params);
    const duration = Date.now() - start;
    logger.debug({ duration, query: text.substring(0, 100) }, 'Database query');
    return result;
  } catch (error) {
    logger.error({ error, query: text.substring(0, 100) }, 'Database query error');
    throw error;
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('Database pool closed');
  }
}
