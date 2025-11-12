interface Citation {
  id: number;
  snapshotId: number;
  ticker: string;
  ts: string;
  source: string;
  url: string;
  snippet: string;
}

/**
 * Build grounded prompt with citations
 */
export function buildPrompt(query: string, citations: Citation[]): string {
  const context = citations
    .map((cite, idx) => {
      return `[#${idx + 1}] ${cite.snippet} (ticker: ${cite.ticker}, source: ${cite.source}, ts: ${cite.ts})`;
    })
    .join('\n');

  return `You are a financial assistant. Only use the provided snippets to answer questions. If you don't have enough information, say you don't know. Always cite your sources using [#] notation.

USER QUERY: ${query}

CONTEXT:
${context}

TASK:
- Summarize the 24-hour sentiment (Positive/Neutral/Negative) for the mentioned tickers
- Identify key drivers and factors
- Include any caveats or limitations
- Include a "Citations:" line with [#] references
- Output a "Confidence:" score from 0-1

Format your response clearly with sections.`;
}
