import { Router, Request, Response } from 'express';
import { adminAuth } from './auth';
import { config } from '../config/env';
import { logger } from '../config/logger';
import { fetchFinnhub } from '../ingest/fetchFinnhub';
import { fetchReddit } from '../ingest/fetchReddit';
import { fetchNewsAPI } from '../ingest/fetchNewsAPI';
import { fetchStocktwits } from '../ingest/fetchStocktwits';
import { deduplicate } from '../ingest/dedup';
import { analyzeSentiment } from '../ingest/sentiment';
import { generateEmbeddings } from '../ingest/embed';
import { aggregateSnapshot, prepareEmbeddingText, saveSnapshot } from '../ingest/aggregate';
import { cleanupOldData } from '../ingest/retention';

const router = Router();

// Ingest endpoint
router.post('/ingest', adminAuth, async (req: Request, res: Response) => {
  try {
    const tier = req.query.tier as string;
    
    if (!tier || !['T0', 'T1', 'T2', 'T3'].includes(tier)) {
      return res.status(400).json({ error: 'Invalid tier. Must be T0, T1, T2, or T3' });
    }

    const tickers = config.TICKER_TIERS[tier] || [];
    
    if (tickers.length === 0) {
      return res.status(400).json({ error: `No tickers configured for tier ${tier}` });
    }

    logger.info('Starting ingestion', { tier, tickerCount: tickers.length });

    let totalItems = 0;
    let snapshotsCreated = 0;

    // Process each ticker
    for (const ticker of tickers) {
      try {
        // Fetch from all sources
        const [finnhubData, redditData, newsapiData, stocktwitsData] = await Promise.allSettled([
          fetchFinnhub(ticker).catch(err => {
            logger.warn('Fetch failed', { error: err, ticker, source: 'finnhub' });
            return null;
          }),
          fetchReddit(ticker).catch(err => {
            logger.warn('Fetch failed', { error: err, ticker, source: 'reddit' });
            return null;
          }),
          fetchNewsAPI(ticker).catch(err => {
            logger.warn('Fetch failed', { error: err, ticker, source: 'newsapi' });
            return null;
          }),
          fetchStocktwits(ticker).catch(err => {
            logger.warn('Fetch failed', { error: err, ticker, source: 'stocktwits' });
            return null;
          }),
        ]);

        // Collect all items
        const allItems: Array<{ title: string; url: string; text: string; source: 'finnhub' | 'reddit' | 'newsapi' | 'stocktwits'; timestamp: Date }> = [];

        if (finnhubData.status === 'fulfilled' && finnhubData.value) {
          allItems.push(...finnhubData.value.items);
        }
        if (redditData.status === 'fulfilled' && redditData.value) {
          allItems.push(...redditData.value.items);
        }
        if (newsapiData.status === 'fulfilled' && newsapiData.value) {
          allItems.push(...newsapiData.value.items);
        }
        if (stocktwitsData.status === 'fulfilled' && stocktwitsData.value) {
          allItems.push(...stocktwitsData.value.items);
        }

        if (allItems.length === 0) {
          logger.debug('No items fetched, skipping', { ticker });
          continue;
        }

        // Deduplicate
        const uniqueItems = deduplicate(allItems);
        totalItems += uniqueItems.length;

        // Group by source
        const bySource = new Map<string, typeof uniqueItems>();
        for (const item of uniqueItems) {
          if (!bySource.has(item.source)) {
            bySource.set(item.source, []);
          }
          bySource.get(item.source)!.push(item);
        }

        // Process each source
        for (const [source, items] of bySource.entries()) {
          if (items.length === 0) continue;

          try {
            // Sentiment analysis
            const texts = items.map(item => item.text);
            const sentiments = await analyzeSentiment(texts);

            // Generate embeddings
            const embeddingTexts = texts;
            const embeddings = await generateEmbeddings(embeddingTexts);

            // Aggregate snapshot
            const snapshot = aggregateSnapshot({
              ticker,
              source: source as 'finnhub' | 'reddit' | 'newsapi' | 'stocktwits',
              items,
              sentiments,
              embeddings,
            });

            // Prepare embedding text
            const embeddingText = prepareEmbeddingText(snapshot);
            const embedding = embeddings[0]?.vector || new Array(384).fill(0);

            // Save to database
            await saveSnapshot(snapshot, embeddingText, embedding);
            snapshotsCreated++;
          } catch (error) {
            logger.error('Failed to process source', { error, ticker, source });
          }
        }
      } catch (error) {
        logger.error('Failed to process ticker', { error, ticker });
      }
    }

    logger.info('Ingestion completed', { tier, tickersProcessed: tickers.length, items: totalItems, snapshotsCreated });

    return res.json({
      tier,
      tickersProcessed: tickers.length,
      items: totalItems,
      snapshotsUpserted: snapshotsCreated,
    });
  } catch (error) {
    logger.error('Ingestion endpoint error', { error });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Retention cleanup endpoint
router.post('/retention', adminAuth, async (_req: Request, res: Response) => {
  try {
    const result = await cleanupOldData();
    return res.json(result);
  } catch (error) {
    logger.error('Retention endpoint error', { error });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
