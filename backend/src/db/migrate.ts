import { readFileSync } from 'fs';
import { join } from 'path';
import { query } from './pg';
import { logger } from '../config/logger';

async function runMigration(file: string) {
  // SQL files are in src/db/sql, but when compiled, we need to reference them from the source
  // Use process.cwd() to get the project root, then navigate to src/db/sql
  const sqlPath = join(process.cwd(), 'src', 'db', 'sql', file);
  const sql = readFileSync(sqlPath, 'utf-8');
  logger.info('Running migration', { file });
  await query(sql);
  logger.info('Migration completed', { file });
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
    logger.error('Migration failed', { error });
    process.exit(1);
  }
}

migrate();
