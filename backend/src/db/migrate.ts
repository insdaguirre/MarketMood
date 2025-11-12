import { readFileSync } from 'fs';
import { join } from 'path';
import { query } from './pg';
import { logger } from '../config/logger';

async function runMigration(file: string) {
  const sql = readFileSync(join(__dirname, 'sql', file), 'utf-8');
  logger.info({ file }, 'Running migration');
  await query(sql);
  logger.info({ file }, 'Migration completed');
}

async function migrate() {
  try {
    logger.info('Starting database migrations');
    
    await runMigration('000_init.sql');
    await runMigration('010_pgvector.sql');
    await runMigration('020_schema.sql');
    
    logger.info('All migrations completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Migration failed');
    process.exit(1);
  }
}

migrate();
