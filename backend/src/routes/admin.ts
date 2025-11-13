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

    // Log API key status
    logger.info('API key status', {
      hasFinnhubKey: !!config.FINNHUB_API_KEY,
      hasRedditKeys: !!(config.REDDIT_CLIENT_ID && config.REDDIT_CLIENT_SECRET),
      hasNewsAPIKey: !!config.NEWSAPI_KEY,
      hasStocktwitsToken: !!config.STOCKTWITS_TOKEN,
    });

    // Process each ticker
    for (const ticker of tickers) {
      try {
        logger.debug('Processing ticker', { ticker });
        
        // Fetch from all sources
        const [finnhubData, redditData, newsapiData, stocktwitsData] = await Promise.allSettled([
          fetchFinnhub(ticker).catch(err => {
            logger.warn('Finnhub fetch failed', { 
              error: err?.message || err, 
              ticker, 
              source: 'finnhub',
              hasApiKey: !!config.FINNHUB_API_KEY
            });
            return null;
          }),
          fetchReddit(ticker).catch(err => {
            logger.warn('Reddit fetch failed', { 
              error: err?.message || err, 
              ticker, 
              source: 'reddit',
              hasApiKeys: !!(config.REDDIT_CLIENT_ID && config.REDDIT_CLIENT_SECRET)
            });
            return null;
          }),
          fetchNewsAPI(ticker).catch(err => {
            logger.warn('NewsAPI fetch failed', { 
              error: err?.message || err, 
              ticker, 
              source: 'newsapi',
              hasApiKey: !!config.NEWSAPI_KEY
            });
            return null;
          }),
          fetchStocktwits(ticker).catch(err => {
            logger.warn('Stocktwits fetch failed', { 
              error: err?.message || err, 
              ticker, 
              source: 'stocktwits',
              hasToken: !!config.STOCKTWITS_TOKEN
            });
            return null;
          }),
        ]);

        // Collect all items and log source status
        const allItems: Array<{ title: string; url: string; text: string; source: 'finnhub' | 'reddit' | 'newsapi' | 'stocktwits'; timestamp: Date }> = [];
        const sourceStatus: Record<string, { success: boolean; itemCount: number; error?: string }> = {};

        if (finnhubData.status === 'fulfilled' && finnhubData.value) {
          const count = finnhubData.value.items.length;
          allItems.push(...finnhubData.value.items);
          sourceStatus.finnhub = { success: true, itemCount: count };
          logger.info('Finnhub data collected', { ticker, count, source: 'finnhub' });
        } else {
          const error = finnhubData.status === 'rejected' ? finnhubData.reason?.message || 'Unknown error' : 'No data returned';
          sourceStatus.finnhub = { success: false, itemCount: 0, error };
          logger.warn('Finnhub failed or empty', { ticker, error, source: 'finnhub' });
        }

        if (redditData.status === 'fulfilled' && redditData.value) {
          const count = redditData.value.items.length;
          allItems.push(...redditData.value.items);
          sourceStatus.reddit = { success: true, itemCount: count };
          logger.info('Reddit data collected', { ticker, count, source: 'reddit' });
        } else {
          const error = redditData.status === 'rejected' ? redditData.reason?.message || 'Unknown error' : 'No data returned';
          sourceStatus.reddit = { success: false, itemCount: 0, error };
          logger.warn('Reddit failed or empty', { ticker, error, source: 'reddit' });
        }

        if (newsapiData.status === 'fulfilled' && newsapiData.value) {
          const count = newsapiData.value.items.length;
          allItems.push(...newsapiData.value.items);
          sourceStatus.newsapi = { success: true, itemCount: count };
          logger.info('NewsAPI data collected', { ticker, count, source: 'newsapi' });
        } else {
          const error = newsapiData.status === 'rejected' ? newsapiData.reason?.message || 'Unknown error' : 'No data returned';
          sourceStatus.newsapi = { success: false, itemCount: 0, error };
          logger.warn('NewsAPI failed or empty', { ticker, error, source: 'newsapi' });
        }

        if (stocktwitsData.status === 'fulfilled' && stocktwitsData.value) {
          const count = stocktwitsData.value.items.length;
          allItems.push(...stocktwitsData.value.items);
          sourceStatus.stocktwits = { success: true, itemCount: count };
          logger.info('Stocktwits data collected', { ticker, count, source: 'stocktwits' });
        } else {
          const error = stocktwitsData.status === 'rejected' ? stocktwitsData.reason?.message || 'Unknown error' : 'No data returned';
          sourceStatus.stocktwits = { success: false, itemCount: 0, error };
          logger.warn('Stocktwits failed or empty', { ticker, error, source: 'stocktwits' });
        }

        // Log summary for this ticker
        logger.info('Ticker source status', { ticker, sourceStatus });

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
            logger.debug('Processing source', { ticker, source, itemCount: items.length });
            
            // Sentiment analysis
            const texts = items.map(item => item.text);
            const sentiments = await analyzeSentiment(texts);
            logger.debug('Sentiment analysis complete', { ticker, source, sentimentCount: sentiments.length });

            // Generate embeddings
            const embeddingTexts = texts;
            const embeddings = await generateEmbeddings(embeddingTexts);
            logger.debug('Embeddings generated', { ticker, source, embeddingCount: embeddings.length });

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
            logger.debug('Snapshot saved', { ticker, source, snapshotTs: snapshot.ts });
          } catch (error: any) {
            logger.error('Failed to process source', { 
              error: error?.message || error,
              stack: error?.stack,
              ticker, 
              source 
            });
          }
        }
      } catch (error: any) {
        logger.error('Failed to process ticker', { 
          error: error?.message || error,
          stack: error?.stack,
          ticker 
        });
      }
    }

    // Log final summary with source breakdown
    const sourceSummary: Record<string, { success: boolean; items: number; snapshots: number }> = {};
    
    logger.info('Ingestion completed', { 
      tier, 
      tickersProcessed: tickers.length, 
      items: totalItems, 
      snapshotsCreated,
      sourceSummary
    });

    return res.json({
      tier,
      tickersProcessed: tickers.length,
      items: totalItems,
      snapshotsUpserted: snapshotsCreated,
      message: 'Check server logs for detailed source-level information',
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
