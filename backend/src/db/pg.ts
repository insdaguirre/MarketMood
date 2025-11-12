import { Pool, PoolConfig } from 'pg';
import { config } from '../config/env';
import { logger } from '../config/logger';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    if (!config.POSTGRES_URL) {
      throw new Error('POSTGRES_URL is not configured');
    }
    
    const poolConfig: PoolConfig = {
      connectionString: config.POSTGRES_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };

    pool = new Pool(poolConfig);

    pool.on('error', (err) => {
      logger.error('Unexpected database error', { error: err });
    });

    pool.on('connect', () => {
      logger.info('Database connection established');
    });
  }

  return pool;
}

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const result = await getPool().query(text, params);
    const duration = Date.now() - start;
    logger.debug('Database query', { duration, query: text.substring(0, 100) });
    return result;
  } catch (error: any) {
    logger.error('Database query error', { 
      error: error?.message || error,
      code: error?.code,
      query: text.substring(0, 100) 
    });
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
