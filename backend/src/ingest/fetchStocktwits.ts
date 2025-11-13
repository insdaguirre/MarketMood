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
  } catch (error: any) {
    logger.warn('Cache read error', { error: error?.message || error, ticker });
  }

  // Check if RapidAPI key is configured
  if (!config.STOCKTWITS_TOKEN) {
    const error = new Error('Stocktwits RapidAPI key not configured: STOCKTWITS_TOKEN missing');
    logger.error('Stocktwits fetch error', { 
      error: error.message,
      ticker,
      hasToken: !!config.STOCKTWITS_TOKEN
    });
    throw error;
  }

  try {
    logger.debug('Fetching Stocktwits data via RapidAPI', { 
      ticker, 
      hasToken: !!config.STOCKTWITS_TOKEN
    });
    
    // Stocktwits via RapidAPI
    const url = `https://stocktwits.p.rapidapi.com/messages/symbol/${ticker}.json?limit=50`;
    
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'x-rapidapi-host': 'stocktwits.p.rapidapi.com',
      'x-rapidapi-key': config.STOCKTWITS_TOKEN,
    };

    logger.debug('Using Stocktwits RapidAPI', { ticker, host: 'stocktwits.p.rapidapi.com' });

    const response = await fetch(url, { headers });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      let errorData: any = {};
      try {
        errorData = JSON.parse(errorText);
      } catch {
        // Not JSON, use as-is
      }
      
      logger.error('Stocktwits RapidAPI HTTP error', { 
        status: response.status,
        statusText: response.statusText,
        errorText: errorData.message || errorData.errors?.[0]?.message || errorText,
        errors: errorData.errors,
        ticker,
        hasToken: !!config.STOCKTWITS_TOKEN,
        url: url.replace(config.STOCKTWITS_TOKEN, '***')
      });
      throw new Error(`Stocktwits RapidAPI error: ${response.status} ${response.statusText} - ${errorData.message || errorData.errors?.[0]?.message || errorText}`);
    }

    const data = await response.json() as StocktwitsResponse;

    logger.debug('Stocktwits response', { 
      ticker, 
      messagesReturned: data.messages?.length || 0,
      hasMore: data.cursor?.more || false
    });

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
    } catch (error: any) {
      logger.warn('Cache write error', { error: error?.message || error });
    }

    logger.info('Fetched Stocktwits data via RapidAPI', { 
      ticker, 
      count: items.length, 
      totalMessages: data.messages?.length || 0,
      source: 'stocktwits'
    });
    return result;
  } catch (error: any) {
    logger.error('Stocktwits fetch error', { 
      error: error?.message || error,
      stack: error?.stack,
      ticker,
      hasToken: !!config.STOCKTWITS_TOKEN
    });
    throw error;
  }
}
