import { config } from '../config/env';
import { logger } from '../config/logger';
import { redis } from '../db/redis';
import { FetchResult } from '../types/api';

const CACHE_TTL = 15 * 60; // 15 minutes

interface FinnhubNewsItem {
  id: number;
  category: string;
  datetime: number;
  headline: string;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

interface FinnhubResponse {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

export async function fetchFinnhub(ticker: string): Promise<FetchResult> {
  const cacheKey = `finnhub:${ticker}`;
  
  // Check cache
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.debug('Cache hit', { ticker, source: 'finnhub' });
      return JSON.parse(cached);
    }
  } catch (error) {
    logger.warn('Cache read error', { error, ticker });
  }

  try {
    const url = `https://finnhub.io/api/v1/company-news?symbol=${ticker}&from=${getDateString(-7)}&to=${getDateString(0)}`;
    const headers: Record<string, string> = {};
    if (config.FINNHUB_API_KEY) {
      headers['X-Finnhub-Token'] = config.FINNHUB_API_KEY;
    }
    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`Finnhub API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as FinnhubNewsItem[];

    const items = data
      .filter(item => item.headline && item.url)
      .map(item => ({
        title: item.headline,
        url: item.url,
        text: item.summary || item.headline,
        source: 'finnhub' as const,
        timestamp: new Date(item.datetime * 1000),
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

    logger.info('Fetched Finnhub data', { ticker, count: items.length, source: 'finnhub' });
    return result;
  } catch (error) {
    logger.error('Finnhub fetch error', { error, ticker });
    throw error;
  }
}

function getDateString(daysOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0];
}
