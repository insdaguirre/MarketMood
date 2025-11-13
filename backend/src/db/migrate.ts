import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { query } from './pg';
import { logger } from '../config/logger';

async function runMigration(file: string) {
  // Try dist/db/sql first (production), then src/db/sql (development)
  let sqlPath = join(__dirname, 'sql', file);
  if (!existsSync(sqlPath)) {
    sqlPath = join(process.cwd(), 'src', 'db', 'sql', file);
  }
  const sql = readFileSync(sqlPath, 'utf-8');
  logger.info('Running migration', { file, path: sqlPath });
  await query(sql);
  logger.info('Migration completed', { file });
}

async function migrate() {
  try {
    logger.info('Starting database migrations');
    
    await runMigration('000_init.sql');
    await runMigration('010_pgvector.sql');
    await runMigration('020_schema.sql');
    await runMigration('030_add_snapshot_unique_constraint.sql');
    
    logger.info('All migrations completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed', { error });
    process.exit(1);
  }
}

migrate();
