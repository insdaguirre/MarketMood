import { query } from '../db/pg';
import { logger } from '../config/logger';
import { config } from '../config/env';

/**
 * Delete snapshots and embeddings older than retention period
 */
export async function cleanupOldData(): Promise<{ snapshots: number; embeddings: number }> {
  const retentionHours = config.RETENTION_HOURS;
  const cutoffTime = new Date(Date.now() - retentionHours * 60 * 60 * 1000);

  try {
    logger.info('Starting retention cleanup', { retentionHours, cutoffTime });

    // Delete embeddings first (due to foreign key constraint)
    const embeddingResult = await query(
      `DELETE FROM "Embedding" WHERE ts < $1`,
      [cutoffTime]
    );
    const embeddingsDeleted = embeddingResult.rowCount || 0;

    // Delete snapshots
    const snapshotResult = await query(
      `DELETE FROM "Snapshot" WHERE ts < $1`,
      [cutoffTime]
    );
    const snapshotsDeleted = snapshotResult.rowCount || 0;

    logger.info(
      'Retention cleanup completed',
      { snapshotsDeleted, embeddingsDeleted, retentionHours }
    );

    return {
      snapshots: snapshotsDeleted,
      embeddings: embeddingsDeleted,
    };
  } catch (error) {
    logger.error('Retention cleanup failed', { error });
    throw error;
  }
}
