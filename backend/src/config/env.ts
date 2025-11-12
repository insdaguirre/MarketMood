import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // External APIs
  FINNHUB_API_KEY: z.string().min(1).optional(),
  REDDIT_CLIENT_ID: z.string().min(1).optional(),
  REDDIT_CLIENT_SECRET: z.string().min(1).optional(),
  REDDIT_USER_AGENT: z.string().default('sentirag/1.0'),
  NEWSAPI_KEY: z.string().min(1).optional(),
  STOCKTWITS_TOKEN: z.string().optional(),

  // Datastores
  POSTGRES_URL: z.string().url().optional(),
  REDIS_URL: z.string().url().optional(),

  // App Configuration
  JWT_SECRET: z.string().min(32).optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(8080),
  ADMIN_KEY: z.string().min(1).optional(),

  // Ticker tiers
  TICKER_TIERS_JSON: z.string().optional(),

  // Feature flags
  ENABLE_BM25: z.coerce.boolean().default(false),
  ENABLE_RERANK: z.coerce.boolean().default(false),
  ANSWER_CACHE_TTL_SEC: z.coerce.number().default(1800),
  RETENTION_HOURS: z.coerce.number().default(24),

  // LLM Provider
  OPENAI_API_KEY: z.string().min(1).optional(),
  LLM_MODEL: z.string().default('gpt-3.5-turbo'),
});

// Make validation lenient for development - only validate in production
const isProduction = process.env.NODE_ENV === 'production';

export type Config = z.infer<typeof envSchema> & {
  TICKER_TIERS: Record<string, string[]>;
};

function parseTickerTiers(jsonStr: string): Record<string, string[]> {
  try {
    return JSON.parse(jsonStr);
  } catch (error) {
    throw new Error('Invalid TICKER_TIERS_JSON format');
  }
}

// Parse with lenient validation in development
const parsed = isProduction 
  ? envSchema.parse(process.env)
  : envSchema.partial().parse(process.env);

export const config: Config = {
  ...parsed,
  TICKER_TIERS: parseTickerTiers(process.env.TICKER_TIERS_JSON || '{}'),
} as Config;
