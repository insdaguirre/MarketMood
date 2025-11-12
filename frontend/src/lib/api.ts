import axios from 'axios';

// Ensure URL has protocol
function normalizeUrl(url: string): string {
  if (!url) return 'http://localhost:8080';
  // If URL doesn't start with http:// or https://, add https://
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
}

const API_BASE_URL = normalizeUrl(import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.message, error.response?.data);
    return Promise.reject(error);
  }
);

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

export const apiClient = {
  getSentiment: async (ticker: string, sinceMinutes?: number): Promise<SentimentResponse> => {
    const params = new URLSearchParams({ ticker });
    if (sinceMinutes) {
      params.append('sinceMinutes', sinceMinutes.toString());
    }
    const response = await api.get<SentimentResponse>(`/api/sentiment?${params}`);
    return response.data;
  },

  ask: async (request: AskRequest): Promise<AskResponse> => {
    const response = await api.post<AskResponse>('/api/ask', request);
    return response.data;
  },
};
