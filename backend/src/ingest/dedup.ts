import { createHash } from 'crypto';
import { FetchResult } from '../types/api';

/**
 * Generate a hash for deduplication based on title, url, and first 200 chars of text
 */
export function generateHash(title: string, url: string, text: string): string {
  const first200 = text.substring(0, 200);
  const content = `${title}|${url}|${first200}`;
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Deduplicate items based on hash
 */
export function deduplicate(items: FetchResult['items']): FetchResult['items'] {
  const seen = new Set<string>();
  const unique: FetchResult['items'] = [];

  for (const item of items) {
    const hash = generateHash(item.title, item.url, item.text);
    if (!seen.has(hash)) {
      seen.add(hash);
      unique.push(item);
    }
  }

  return unique;
}

/**
 * Deduplicate across multiple fetch results
 */
export function deduplicateResults(results: FetchResult[]): FetchResult[] {
  const allItems: FetchResult['items'] = [];
  
  for (const result of results) {
    allItems.push(...result.items);
  }

  const unique = deduplicate(allItems);

  // Return deduplicated items grouped by source
  const bySource = new Map<string, FetchResult['items']>();
  for (const item of unique) {
    if (!bySource.has(item.source)) {
      bySource.set(item.source, []);
    }
    bySource.get(item.source)!.push(item);
  }

  return Array.from(bySource.entries()).map(([, items]) => ({
    ticker: '', // Will be set by caller
    items,
  }));
}
