-- MarketMood Database Schema
-- Full schema definition for Users, Orgs, Snapshots, Embeddings, and QueryLog

-- Users & Auth
CREATE TABLE IF NOT EXISTS "User" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Org" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Membership" (
  user_id UUID REFERENCES "User"(id) ON DELETE CASCADE,
  org_id UUID REFERENCES "Org"(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  PRIMARY KEY (user_id, org_id)
);

-- Usage (for quotas)
CREATE TABLE IF NOT EXISTS "UsageDaily" (
  org_id UUID REFERENCES "Org"(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  queries INT DEFAULT 0,
  sentiment_calls INT DEFAULT 0,
  PRIMARY KEY (org_id, date)
);

-- Sentiment snapshots (1-day retention)
-- Create enum type if it doesn't exist
DO $$ BEGIN
    CREATE TYPE source_enum AS ENUM ('news','reddit','stocktwits','finnhub');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "Snapshot" (
  id BIGSERIAL PRIMARY KEY,
  ticker TEXT NOT NULL,
  source source_enum NOT NULL,
  ts TIMESTAMPTZ NOT NULL,           -- snapshot instant (minute-level)
  mean_score REAL NOT NULL,          -- -1..1
  pos_ratio REAL NOT NULL,
  neg_ratio REAL NOT NULL,
  neu_ratio REAL NOT NULL,
  volume INT NOT NULL DEFAULT 0,
  top_mentions JSONB,                -- [{text,url,score}]
  inserted_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS snapshot_idx ON "Snapshot"(ticker, ts DESC);
CREATE INDEX IF NOT EXISTS snapshot_source_idx ON "Snapshot"(source, ts DESC);
CREATE INDEX IF NOT EXISTS snapshot_ts_idx ON "Snapshot"(ts DESC);

-- Embedding vectors for RAG (derived from snapshot text)
-- Use 384 dims for e5-small
CREATE TABLE IF NOT EXISTS "Embedding" (
  id BIGSERIAL PRIMARY KEY,
  snapshot_id BIGINT REFERENCES "Snapshot"(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  ts TIMESTAMPTZ NOT NULL,
  text TEXT NOT NULL,                   -- compact, ≤ 400-600 chars
  embedding vector(384) NOT NULL
);

CREATE INDEX IF NOT EXISTS embedding_ticker_ts_idx ON "Embedding"(ticker, ts DESC);
CREATE INDEX IF NOT EXISTS embedding_hnsw_idx ON "Embedding" USING hnsw (embedding vector_l2_ops);

-- Query log for analytics
CREATE TABLE IF NOT EXISTS "QueryLog" (
  id BIGSERIAL PRIMARY KEY,
  org_id UUID,
  user_id UUID,
  query TEXT,
  tickers TEXT[],
  retrieved INT,
  latency_ms INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS querylog_org_date_idx ON "QueryLog"(org_id, created_at DESC);
