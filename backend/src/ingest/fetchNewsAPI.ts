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
      logger.debug('Cache hit', { ticker, source: 'newsapi' });
      return JSON.parse(cached);
    }
  } catch (error: any) {
    logger.warn('Cache read error', { error: error?.message || error, ticker });
  }

  // Check if API key is configured
  if (!config.NEWSAPI_KEY) {
    const error = new Error('NewsAPI key not configured: NEWSAPI_KEY missing');
    logger.error('NewsAPI fetch error', { 
      error: error.message,
      ticker,
      hasApiKey: !!config.NEWSAPI_KEY
    });
    throw error;
  }

  try {
    logger.debug('Fetching NewsAPI data', { ticker, hasApiKey: !!config.NEWSAPI_KEY });
    
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 7);
    const from = fromDate.toISOString().split('T')[0];
    const to = new Date().toISOString().split('T')[0];

    // Search for ticker in financial news
    const query = `${ticker} AND (stock OR shares OR trading OR market)`;
    const sources = FINANCIAL_SOURCES.join(',');
    
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sources=${sources}&from=${from}&to=${to}&sortBy=relevancy&pageSize=50&apiKey=${config.NEWSAPI_KEY}`;
    
    logger.debug('NewsAPI request', { ticker, url: url.replace(config.NEWSAPI_KEY, '***'), from, to });
    
    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      let errorData: any = {};
      try {
        errorData = JSON.parse(errorText);
      } catch {
        // Not JSON, use as-is
      }
      
      logger.error('NewsAPI HTTP error', { 
        status: response.status,
        statusText: response.statusText,
        errorText: errorData.message || errorText,
        code: errorData.code,
        ticker,
        hasApiKey: !!config.NEWSAPI_KEY
      });
      throw new Error(`NewsAPI error: ${response.status} ${response.statusText} - ${errorData.message || errorText}`);
    }

    const data = await response.json() as NewsAPIResponse;

    if (data.status !== 'ok') {
      logger.error('NewsAPI API error', { 
        status: data.status,
        totalResults: data.totalResults,
        ticker,
        hasApiKey: !!config.NEWSAPI_KEY
      });
      throw new Error(`NewsAPI returned status: ${data.status}`);
    }

    logger.debug('NewsAPI response', { 
      ticker, 
      totalResults: data.totalResults,
      articlesReturned: data.articles.length
    });

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
    } catch (error: any) {
      logger.warn('Cache write error', { error: error?.message || error });
    }

    logger.info('Fetched NewsAPI data', { 
      ticker, 
      count: items.length, 
      totalResults: data.totalResults,
      source: 'newsapi' 
    });
    return result;
  } catch (error: any) {
    logger.error('NewsAPI fetch error', { 
      error: error?.message || error,
      stack: error?.stack,
      ticker,
      hasApiKey: !!config.NEWSAPI_KEY
    });
    throw error;
  }
}
