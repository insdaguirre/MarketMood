import { config } from '../config/env';
import { logger } from '../config/logger';
import { redis } from '../db/redis';
import { createHash } from 'crypto';
import { buildPrompt } from './prompt';
import { AskResponse } from '../types/api';

const CACHE_TTL = config.ANSWER_CACHE_TTL_SEC;

/**
 * Generate cache key for query
 */
function getCacheKey(query: string, tickers: string[], topIds: number[]): string {
  const content = `${query}|${tickers.sort().join(',')}|${topIds.sort().join(',')}`;
  return `ans:${createHash('sha256').update(content).digest('hex')}`;
}

/**
 * Call LLM API to generate answer
 */
async function callLLM(prompt: string): Promise<string> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.LLM_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful financial assistant that provides accurate, cited information about stock market sentiment.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${error}`);
    }

    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    return data.choices[0].message.content;
  } catch (error) {
    logger.error('LLM API error', { error });
    throw error;
  }
}

/**
 * Generate answer with caching
 */
export async function generateAnswer(
  query: string,
  citations: AskResponse['citations'],
  tickers: string[]
): Promise<string> {
  // Check cache
  const topIds = citations.map(c => c.embeddingId).sort();
  const cacheKey = getCacheKey(query, tickers, topIds);

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.debug('Answer cache hit', { query: query.substring(0, 50) });
      return cached;
    }
  } catch (error) {
    logger.warn('Cache read error', { error });
  }

  // Generate prompt
  const prompt = buildPrompt(query, citations.map(c => ({
    id: c.embeddingId,
    snapshotId: c.snapshotId,
    ticker: c.ticker,
    ts: c.ts,
    source: c.source,
    url: c.url,
    snippet: c.snippet,
  })));

  // Call LLM
  const answer = await callLLM(prompt);

  // Cache answer
  try {
    await redis.setex(cacheKey, CACHE_TTL, answer);
  } catch (error) {
    logger.warn('Cache write error', { error });
  }

  return answer;
}
