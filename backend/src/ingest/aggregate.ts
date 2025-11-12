import { FetchResult } from '../types/api';
import { SentimentResult } from '../types/api';
import { EmbeddingResult } from '../types/api';
import { query } from '../db/pg';
import { logger } from '../config/logger';

interface SnapshotData {
  ticker: string;
  source: 'finnhub' | 'reddit' | 'newsapi' | 'stocktwits';
  ts: Date;
  mean_score: number;
  pos_ratio: number;
  neg_ratio: number;
  neu_ratio: number;
  volume: number;
  top_mentions: Array<{ text: string; url: string; score: number }>;
}

interface AggregationInput {
  ticker: string;
  source: 'finnhub' | 'reddit' | 'newsapi' | 'stocktwits';
  items: FetchResult['items'];
  sentiments: SentimentResult[];
  embeddings: EmbeddingResult[];
}

/**
 * Aggregate sentiment data into snapshots
 */
export function aggregateSnapshot(input: AggregationInput): SnapshotData {
  const { ticker, source, items, sentiments, embeddings } = input;
  
  if (items.length === 0) {
    throw new Error('Cannot aggregate empty items array');
  }

  // Calculate sentiment statistics
  const scores = sentiments.map(s => s.score);
  const mean_score = scores.reduce((a, b) => a + b, 0) / scores.length;
  
  const posCount = sentiments.filter(s => s.label === 'positive').length;
  const negCount = sentiments.filter(s => s.label === 'negative').length;
  const neuCount = sentiments.filter(s => s.label === 'neutral').length;
  const total = sentiments.length;
  
  const pos_ratio = posCount / total;
  const neg_ratio = negCount / total;
  const neu_ratio = neuCount / total;
  
  // Get top mentions (top 3 by score)
  const mentionsWithScores = items.map((item, idx) => ({
    text: item.title,
    url: item.url,
    score: Math.abs(sentiments[idx]?.score || 0),
  }));
  
  const top_mentions = mentionsWithScores
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(m => ({
      text: m.text.substring(0, 200), // Limit text length
      url: m.url,
      score: m.score,
    }));

  // Round timestamp to minute
  const ts = new Date(items[0].timestamp);
  ts.setSeconds(0, 0);

  return {
    ticker,
    source,
    ts,
    mean_score,
    pos_ratio,
    neg_ratio,
    neu_ratio,
    volume: items.length,
    top_mentions,
  };
}

/**
 * Prepare embedding text for storage
 */
export function prepareEmbeddingText(snapshot: SnapshotData): string {
  const { ticker, source, mean_score, pos_ratio, neg_ratio, neu_ratio, volume, top_mentions } = snapshot;
  
  const headlines = top_mentions.map(m => m.text).join('; ');
  
  return `${ticker} ${source} sentiment: mean=${mean_score.toFixed(3)} pos=${(pos_ratio * 100).toFixed(1)}% neg=${(neg_ratio * 100).toFixed(1)}% neu=${(neu_ratio * 100).toFixed(1)}%, volume=${volume}; headlines: ${headlines}`;
}

/**
 * Save snapshot and embeddings to database
 */
export async function saveSnapshot(
  snapshot: SnapshotData,
  embeddingText: string,
  embedding: number[]
): Promise<{ snapshotId: number; embeddingId: number }> {
  try {
    // Insert snapshot
    const snapshotResult = await query(
      `INSERT INTO "Snapshot" (ticker, source, ts, mean_score, pos_ratio, neg_ratio, neu_ratio, volume, top_mentions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [
        snapshot.ticker,
        snapshot.source,
        snapshot.ts,
        snapshot.mean_score,
        snapshot.pos_ratio,
        snapshot.neg_ratio,
        snapshot.neu_ratio,
        snapshot.volume,
        JSON.stringify(snapshot.top_mentions),
      ]
    );

    let snapshotId: number;
    if (snapshotResult.rows.length > 0) {
      snapshotId = snapshotResult.rows[0].id;
    } else {
      // If conflict, fetch existing
      const existing = await query(
        `SELECT id FROM "Snapshot" WHERE ticker = $1 AND source = $2 AND ts = $3`,
        [snapshot.ticker, snapshot.source, snapshot.ts]
      );
      snapshotId = existing.rows[0].id;
    }

    // Insert embedding
    const embeddingResult = await query(
      `INSERT INTO "Embedding" (snapshot_id, ticker, ts, text, embedding)
       VALUES ($1, $2, $3, $4, $5::vector)
       RETURNING id`,
      [
        snapshotId,
        snapshot.ticker,
        snapshot.ts,
        embeddingText,
        `[${embedding.join(',')}]`, // Convert array to pgvector format
      ]
    );

    const embeddingId = embeddingResult.rows[0].id;

    logger.debug({ snapshotId, embeddingId, ticker: snapshot.ticker }, 'Saved snapshot and embedding');

    return { snapshotId, embeddingId };
  } catch (error) {
    logger.error({ error, ticker: snapshot.ticker }, 'Failed to save snapshot');
    throw error;
  }
}
