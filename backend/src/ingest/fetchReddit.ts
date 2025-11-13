import { config } from '../config/env';
import { logger } from '../config/logger';
import { redis } from '../db/redis';
import { FetchResult } from '../types/api';

const CACHE_TTL = 30 * 60; // 30 minutes
const SUBREDDITS = ['stocks', 'investing', 'SecurityAnalysis', 'StockMarket'];

interface RedditPost {
  data: {
    title: string;
    url: string;
    selftext: string;
    created_utc: number;
    permalink: string;
    score: number;
    num_comments: number;
  };
}

interface RedditResponse {
  data: {
    children: RedditPost[];
    after: string | null;
  };
}

let accessToken: string | null = null;
let tokenExpiry: number = 0;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  
  if (accessToken && now < tokenExpiry) {
    logger.debug('Using cached Reddit access token');
    return accessToken;
  }

  // Check if API keys are configured
  if (!config.REDDIT_CLIENT_ID || !config.REDDIT_CLIENT_SECRET) {
    const error = new Error('Reddit API keys not configured: REDDIT_CLIENT_ID and/or REDDIT_CLIENT_SECRET missing');
    logger.error('Reddit authentication error', { 
      error: error.message,
      hasClientId: !!config.REDDIT_CLIENT_ID,
      hasClientSecret: !!config.REDDIT_CLIENT_SECRET
    });
    throw error;
  }

  try {
    const auth = Buffer.from(`${config.REDDIT_CLIENT_ID}:${config.REDDIT_CLIENT_SECRET}`).toString('base64');
    const response = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': config.REDDIT_USER_AGENT,
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      logger.error('Reddit auth API error', { 
        status: response.status,
        statusText: response.statusText,
        errorText,
        hasClientId: !!config.REDDIT_CLIENT_ID,
        hasClientSecret: !!config.REDDIT_CLIENT_SECRET
      });
      throw new Error(`Reddit auth error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json() as { access_token: string; expires_in: number };
    accessToken = data.access_token;
    tokenExpiry = now + (data.expires_in * 1000) - 60000; // Refresh 1 min early

    logger.info('Reddit access token refreshed', { expiresIn: data.expires_in });
    return accessToken;
  } catch (error: any) {
    logger.error('Reddit authentication error', { 
      error: error?.message || error,
      stack: error?.stack,
      hasClientId: !!config.REDDIT_CLIENT_ID,
      hasClientSecret: !!config.REDDIT_CLIENT_SECRET
    });
    throw error;
  }
}

export async function fetchReddit(ticker: string): Promise<FetchResult> {
  const cacheKey = `reddit:${ticker}`;
  
  // Check cache
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.debug('Cache hit', { ticker, source: 'reddit' });
      return JSON.parse(cached);
    }
  } catch (error: any) {
    logger.warn('Cache read error', { error: error?.message || error, ticker });
  }

  try {
    logger.debug('Fetching Reddit data', { ticker, hasApiKeys: !!(config.REDDIT_CLIENT_ID && config.REDDIT_CLIENT_SECRET) });
    
    const token = await getAccessToken();
    logger.debug('Reddit token obtained', { ticker, hasToken: !!token });
    
    const items: FetchResult['items'] = [];
    let subredditErrors = 0;

    // Search across multiple subreddits
    for (const subreddit of SUBREDDITS) {
      try {
        const url = `https://oauth.reddit.com/r/${subreddit}/search.json?q=${ticker}&sort=relevance&limit=25&restrict_sr=1`;
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'User-Agent': config.REDDIT_USER_AGENT,
          },
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          logger.warn('Reddit API error', { 
            subreddit, 
            status: response.status,
            statusText: response.statusText,
            errorText,
            ticker
          });
          subredditErrors++;
          continue;
        }

        const data = await response.json() as RedditResponse;
        const postsFound = data.data.children.length;
        logger.debug('Reddit subreddit fetch', { subreddit, postsFound, ticker });
        
        for (const post of data.data.children) {
          const text = post.data.selftext || post.data.title;
          if (text.toLowerCase().includes(ticker.toLowerCase())) {
            items.push({
              title: post.data.title,
              url: `https://reddit.com${post.data.permalink}`,
              text: text.substring(0, 1000), // Limit text length
              source: 'reddit' as const,
              timestamp: new Date(post.data.created_utc * 1000),
            });
          }
        }

        // Rate limiting - be respectful
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error: any) {
        logger.warn('Error fetching from subreddit', { 
          error: error?.message || error,
          subreddit,
          ticker
        });
        subredditErrors++;
      }
    }

    const result: FetchResult = {
      ticker,
      items: items.slice(0, 50), // Limit to 50 items
    };

    // Cache result
    try {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
    } catch (error: any) {
      logger.warn('Cache write error', { error: error?.message || error });
    }

    logger.info('Fetched Reddit data', { 
      ticker, 
      count: result.items.length, 
      source: 'reddit',
      subredditsSearched: SUBREDDITS.length,
      subredditErrors
    });
    return result;
  } catch (error: any) {
    logger.error('Reddit fetch error', { 
      error: error?.message || error,
      stack: error?.stack,
      ticker,
      hasApiKeys: !!(config.REDDIT_CLIENT_ID && config.REDDIT_CLIENT_SECRET)
    });
    throw error;
  }
}
