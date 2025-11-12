import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../db/pg';
import { logger } from '../config/logger';
import { rateLimiters } from '../config/rateLimit';
import { authenticate, AuthRequest } from './auth';
import { vectorSearch, getSnapshotDetails } from '../retrieval/search';
import { generateAnswer } from '../llm/answer';
import { SentimentResponse, AskRequest, AskResponse } from '../types/api';

const router = Router();

// Sentiment endpoint
router.get(
  '/sentiment',
  rateLimiters.sentiment,
  async (req: Request, res: Response): Promise<void> => {
    const ticker = req.query.ticker as string;
    
    try {
      const sinceMinutes = parseInt(req.query.sinceMinutes as string) || 1440;

      if (!ticker) {
        res.status(400).json({ error: 'ticker parameter is required' });
        return;
      }

      // Validate ticker format
      if (!/^[A-Z]{1,5}(\.[A-Z])?$/.test(ticker)) {
        res.status(400).json({ error: 'Invalid ticker format' });
        return;
      }

      const cutoffTime = new Date(Date.now() - sinceMinutes * 60 * 1000);

      let result;
      try {
        result = await query(
          `SELECT ts, source, mean_score as mean, pos_ratio as pos, neg_ratio as neg, neu_ratio as neu, volume as vol
           FROM "Snapshot"
           WHERE ticker = $1 AND ts >= $2
           ORDER BY ts DESC, source`,
          [ticker, cutoffTime]
        );
      } catch (dbError: any) {
        // Check if it's a "table doesn't exist" error
        if (dbError?.code === '42P01' || dbError?.message?.includes('does not exist')) {
          logger.warn('Database tables not found - migrations may not have been run', { ticker });
          // Return empty result instead of error
          const response: SentimentResponse = {
            ticker,
            snapshots: [],
            updatedAt: new Date().toISOString(),
          };
          res.json(response);
          return;
        }
        // Re-throw other database errors
        throw dbError;
      }

      const snapshots = result.rows.map(row => ({
        ts: row.ts.toISOString(),
        source: row.source,
        mean: parseFloat(row.mean),
        pos: parseFloat(row.pos),
        neg: parseFloat(row.neg),
        neu: parseFloat(row.neu),
        vol: parseInt(row.vol),
      }));

      const response: SentimentResponse = {
        ticker,
        snapshots,
        updatedAt: new Date().toISOString(),
      };

      res.json(response);
      return;
    } catch (error: any) {
      logger.error('Sentiment endpoint error', { 
        error: error?.message || error,
        stack: error?.stack,
        ticker: ticker || 'unknown'
      });
      res.status(500).json({ 
        error: 'Internal server error',
        message: error?.message || 'Unknown error'
      });
      return;
    }
  }
);

// Ask endpoint (RAG Q&A)
router.post(
  '/ask',
  authenticate,
  rateLimiters.ask,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const startTime = Date.now();
    
    try {
      const body = req.body as AskRequest;
      
      // Validate request
      const schema = z.object({
        query: z.string().min(1).max(500),
        tickers: z.array(z.string()).min(1).max(10),
        k: z.number().int().min(1).max(20).optional().default(12),
      });

      const validated = schema.parse(body);
      const { query: queryText, tickers, k } = validated;

      // Validate tickers
      for (const ticker of tickers) {
        if (!/^[A-Z]{1,5}(\.[A-Z])?$/.test(ticker)) {
          res.status(400).json({ error: `Invalid ticker format: ${ticker}` });
          return;
        }
      }

      // Vector search
      const searchResults = await vectorSearch(queryText, tickers, k, 24);

      if (searchResults.length === 0) {
        res.json({
          answer: 'I could not find any relevant information about the requested tickers in the last 24 hours.',
          citations: [],
          retrieved: 0,
          latencyMs: Date.now() - startTime,
        } as AskResponse);
        return;
      }

      // Get snapshot details
      const snapshotIds = [...new Set(searchResults.map(r => r.snapshot_id))];
      const snapshots = await getSnapshotDetails(snapshotIds);
      const snapshotMap = new Map(snapshots.map(s => [s.id, s]));

      // Build citations
      const citations: AskResponse['citations'] = searchResults.map(result => {
        const snapshot = snapshotMap.get(result.snapshot_id);
        const topMention = snapshot?.top_mentions?.[0];
        
        return {
          embeddingId: result.id,
          snapshotId: result.snapshot_id,
          ticker: result.ticker,
          ts: result.ts.toISOString(),
          source: snapshot?.source || 'unknown',
          url: topMention?.url || '',
          snippet: result.text.substring(0, 200),
        };
      });

      // Generate answer
      const answer = await generateAnswer(queryText, citations, tickers);

      // Log query
      if (req.orgId) {
        await query(
          `INSERT INTO "QueryLog" (org_id, user_id, query, tickers, retrieved, latency_ms)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            req.orgId,
            req.userId || null,
            queryText,
            tickers,
            searchResults.length,
            Date.now() - startTime,
          ]
        );
      }

      const response: AskResponse = {
        answer,
        citations,
        retrieved: searchResults.length,
        latencyMs: Date.now() - startTime,
      };

      res.json(response);
      return;
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid request', details: error.errors });
        return;
      }
      
      logger.error('Ask endpoint error', { error });
      res.status(500).json({ error: 'Internal server error' });
      return;
    }
  }
);

export default router;
