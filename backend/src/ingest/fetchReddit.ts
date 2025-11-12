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
    return accessToken;
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
      throw new Error(`Reddit auth error: ${response.status}`);
    }

    const data = await response.json() as { access_token: string; expires_in: number };
    accessToken = data.access_token;
    tokenExpiry = now + (data.expires_in * 1000) - 60000; // Refresh 1 min early

    logger.debug('Reddit access token refreshed');
    return accessToken;
  } catch (error) {
    logger.error('Reddit authentication error', { error });
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
  } catch (error) {
    logger.warn('Cache read error', { error, ticker });
  }

  try {
    const token = await getAccessToken();
    const items: FetchResult['items'] = [];

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
          logger.warn('Reddit API error', { subreddit, status: response.status });
          continue;
        }

        const data = await response.json() as RedditResponse;
        
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
      } catch (error) {
        logger.warn('Error fetching from subreddit', { error, subreddit });
      }
    }

    const result: FetchResult = {
      ticker,
      items: items.slice(0, 50), // Limit to 50 items
    };

    // Cache result
    try {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
    } catch (error) {
      logger.warn('Cache write error', { error });
    }

    logger.info('Fetched Reddit data', { ticker, count: result.items.length, source: 'reddit' });
    return result;
  } catch (error) {
    logger.error('Reddit fetch error', { error, ticker });
    throw error;
  }
}
