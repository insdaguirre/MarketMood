import { query } from '../db/pg';
import { logger } from '../config/logger';
import { generateEmbedding } from '../ingest/embed';

interface SearchResult {
  id: number;
  snapshot_id: number;
  ticker: string;
  ts: Date;
  text: string;
  similarity: number;
}

/**
 * Search for similar embeddings using pgvector KNN
 */
export async function vectorSearch(
  queryText: string,
  tickers: string[],
  k: number = 12,
  hoursWindow: number = 24
): Promise<SearchResult[]> {
  try {
    // Generate query embedding
    const { vector } = await generateEmbedding(queryText);
    
    // Convert vector to pgvector format
    const vectorStr = `[${vector.join(',')}]`;
    
    // Build query with ticker filter and time window
    const tickerFilter = tickers.length > 0 
      ? `AND ticker = ANY($2::text[])`
      : '';
    
    const params: any[] = [vectorStr];
    if (tickers.length > 0) {
      params.push(tickers);
    }
    params.push(`${hoursWindow} hours`);

    // Use cosine distance (1 - cosine similarity)
    // For normalized vectors, cosine distance = 1 - dot product
    const sql = `
      SELECT 
        id,
        snapshot_id,
        ticker,
        ts,
        text,
        1 - (embedding <=> $1::vector) AS similarity
      FROM "Embedding"
      WHERE ts > now() - $${params.length}::interval
        ${tickerFilter}
      ORDER BY embedding <=> $1::vector
      LIMIT $${params.length + 1}
    `;

    params.push(k);

    const result = await query(sql, params);
    
    const results: SearchResult[] = result.rows.map(row => ({
      id: row.id,
      snapshot_id: row.snapshot_id,
      ticker: row.ticker,
      ts: new Date(row.ts),
      text: row.text,
      similarity: parseFloat(row.similarity),
    }));

    logger.debug('Vector search completed', { 
      queryLength: queryText.length, 
      tickers, 
      resultsCount: results.length 
    });

    return results;
  } catch (error) {
    logger.error('Vector search error', { error, queryText: queryText.substring(0, 50) });
    throw error;
  }
}

/**
 * Get snapshot details for search results
 */
export async function getSnapshotDetails(snapshotIds: number[]): Promise<any[]> {
  if (snapshotIds.length === 0) return [];

  try {
    const result = await query(
      `SELECT id, ticker, source, ts, top_mentions
       FROM "Snapshot"
       WHERE id = ANY($1::bigint[])`,
      [snapshotIds]
    );

    return result.rows.map(row => ({
      id: row.id,
      ticker: row.ticker,
      source: row.source,
      ts: new Date(row.ts),
      top_mentions: row.top_mentions,
    }));
  } catch (error) {
    logger.error('Failed to get snapshot details', { error });
    throw error;
  }
}
