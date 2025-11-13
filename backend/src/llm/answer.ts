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
  if (!config.OPENAI_API_KEY) {
    logger.warn('OPENAI_API_KEY not configured, using fallback answer');
    return 'I apologize, but the AI service is not currently configured. Please check the OPENAI_API_KEY environment variable.';
  }

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
      const errorText = await response.text();
      logger.error('OpenAI API error', { 
        status: response.status, 
        statusText: response.statusText,
        error: errorText 
      });
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }

    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    if (!data.choices || !data.choices[0]?.message?.content) {
      throw new Error('Invalid response from OpenAI API');
    }
    return data.choices[0].message.content;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('LLM API error', { 
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
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
