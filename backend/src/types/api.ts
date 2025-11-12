// Shared API types and interfaces

export interface SentimentResponse {
  ticker: string;
  snapshots: Array<{
    ts: string;
    source: string;
    mean: number;
    pos: number;
    neg: number;
    neu: number;
    vol: number;
  }>;
  updatedAt: string;
}

export interface AskRequest {
  query: string;
  tickers: string[];
  k?: number;
}

export interface AskResponse {
  answer: string;
  citations: Array<{
    embeddingId: number;
    snapshotId: number;
    ticker: string;
    ts: string;
    source: string;
    url: string;
    snippet: string;
  }>;
  retrieved: number;
  latencyMs: number;
}

export interface FetchResult {
  ticker: string;
  items: Array<{
    title: string;
    url: string;
    text: string;
    source: 'finnhub' | 'reddit' | 'newsapi' | 'stocktwits';
    timestamp: Date;
  }>;
}

export interface SentimentResult {
  label: 'positive' | 'negative' | 'neutral';
  score: number; // -1 to 1
}

export interface EmbeddingResult {
  vector: number[]; // 384 dimensions
  text: string;
}
