import { config } from '../config/env';
import { logger } from '../config/logger';
import { redis } from '../db/redis';
import { FetchResult } from '../types/api';

const CACHE_TTL = 15 * 60; // 15 minutes

interface NewsAPIArticle {
  source: {
    id: string | null;
    name: string;
  };
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
}

interface NewsAPIResponse {
  status: string;
  totalResults: number;
  articles: NewsAPIArticle[];
}

const FINANCIAL_SOURCES = [
  'bloomberg',
  'financial-times',
  'the-wall-street-journal',
  'reuters',
  'cnbc',
  'financial-post',
  'business-insider',
];

export async function fetchNewsAPI(ticker: string): Promise<FetchResult> {
  const cacheKey = `newsapi:${ticker}`;
  
  // Check cache
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.debug({ ticker, source: 'newsapi' }, 'Cache hit');
      return JSON.parse(cached);
    }
  } catch (error) {
    logger.warn({ error, ticker }, 'Cache read error');
  }

  try {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 7);
    const from = fromDate.toISOString().split('T')[0];
    const to = new Date().toISOString().split('T')[0];

    // Search for ticker in financial news
    const query = `${ticker} AND (stock OR shares OR trading OR market)`;
    const sources = FINANCIAL_SOURCES.join(',');
    
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sources=${sources}&from=${from}&to=${to}&sortBy=relevancy&pageSize=50&apiKey=${config.NEWSAPI_KEY}`;
    
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`NewsAPI error: ${response.status} ${response.statusText}`);
    }

    const data: NewsAPIResponse = await response.json();

    if (data.status !== 'ok') {
      throw new Error(`NewsAPI returned status: ${data.status}`);
    }

    const items = data.articles
      .filter(article => article.title && article.url)
      .map(article => ({
        title: article.title,
        url: article.url,
        text: article.description || article.content || article.title,
        source: 'newsapi' as const,
        timestamp: new Date(article.publishedAt),
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
      logger.warn({ error }, 'Cache write error');
    }

    logger.info({ ticker, count: items.length, source: 'newsapi' }, 'Fetched NewsAPI data');
    return result;
  } catch (error) {
    logger.error({ error, ticker }, 'NewsAPI fetch error');
    throw error;
  }
}
