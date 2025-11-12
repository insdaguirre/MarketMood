import { config } from '../config/env';
import { logger } from '../config/logger';
import { redis } from '../db/redis';
import { FetchResult } from '../types/api';

const CACHE_TTL = 30 * 60; // 30 minutes

interface StocktwitsMessage {
  id: number;
  body: string;
  created_at: string;
  user: {
    username: string;
  };
  symbols: Array<{
    symbol: string;
  }>;
  links: Array<{
    url: string;
  }>;
}

interface StocktwitsResponse {
  messages: StocktwitsMessage[];
  cursor: {
    max: number;
    since: number;
    more: boolean;
  };
}

export async function fetchStocktwits(ticker: string): Promise<FetchResult> {
  const cacheKey = `stocktwits:${ticker}`;
  
  // Check cache
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.debug('Cache hit', { ticker, source: 'stocktwits' });
      return JSON.parse(cached);
    }
  } catch (error) {
    logger.warn('Cache read error', { error, ticker });
  }

  try {
    // Stocktwits API v2
    const url = `https://api.stocktwits.com/api/2/streams/symbol/${ticker}.json?limit=50`;
    
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    // Add token if available
    if (config.STOCKTWITS_TOKEN) {
      headers['Authorization'] = `Bearer ${config.STOCKTWITS_TOKEN}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`Stocktwits API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as StocktwitsResponse;

    const items = (data.messages || [])
      .filter(msg => msg.body && msg.body.length > 0)
      .map(msg => ({
        title: `Stocktwits: ${msg.user.username}`,
        url: msg.links && msg.links.length > 0 ? msg.links[0].url : `https://stocktwits.com/symbol/${ticker}`,
        text: msg.body,
        source: 'stocktwits' as const,
        timestamp: new Date(msg.created_at),
      }))
      .slice(0, 50); // Limit to 50 items

    const result: FetchResult = {
      ticker,
      items,
    };

    // Cache result
    try {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
    } catch (error) {
      logger.warn('Cache write error', { error });
    }

    logger.info('Fetched Stocktwits data', { ticker, count: items.length, source: 'stocktwits' });
    return result;
  } catch (error) {
    logger.error('Stocktwits fetch error', { error, ticker });
    throw error;
  }
}
