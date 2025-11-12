import * as ort from 'onnxruntime-node';
import { logger } from '../config/logger';
import { SentimentResult } from '../types/api';
import { join } from 'path';

const BATCH_SIZE = 64;
let session: ort.InferenceSession | null = null;

/**
 * Initialize FinBERT model
 * Note: In production, download the ONNX model and place it in backend/models/
 */
async function initializeModel(): Promise<ort.InferenceSession> {
  if (session) {
    return session;
  }

  try {
    const modelPath = join(__dirname, '../../models/finbert.onnx');
    // For MVP, we'll use a mock implementation if model doesn't exist
    // In production, ensure the model is downloaded and available
    
    try {
      session = await ort.InferenceSession.create(modelPath);
      logger.info('FinBERT model loaded');
    } catch (error) {
      logger.warn('FinBERT model not found, using mock sentiment analysis', { error });
      // Will use mock implementation below
    }

    return session!;
  } catch (error) {
    logger.error('Failed to initialize FinBERT model', { error });
    throw error;
  }
}

/**
 * Mock sentiment analysis for development when model is not available
 */
function mockSentimentAnalysis(text: string): SentimentResult {
  const lowerText = text.toLowerCase();
  const positiveWords = ['up', 'rise', 'gain', 'bullish', 'buy', 'growth', 'profit', 'strong'];
  const negativeWords = ['down', 'fall', 'drop', 'bearish', 'sell', 'loss', 'weak', 'crash'];
  
  let positiveCount = 0;
  let negativeCount = 0;
  
  for (const word of positiveWords) {
    if (lowerText.includes(word)) positiveCount++;
  }
  for (const word of negativeWords) {
    if (lowerText.includes(word)) negativeCount++;
  }
  
  if (positiveCount > negativeCount) {
    return { label: 'positive', score: 0.5 + Math.random() * 0.5 };
  } else if (negativeCount > positiveCount) {
    return { label: 'negative', score: -0.5 - Math.random() * 0.5 };
  } else {
    return { label: 'neutral', score: (Math.random() - 0.5) * 0.3 };
  }
}

/**
 * Process sentiment for a single text
 */
async function processSentiment(text: string): Promise<SentimentResult> {
  try {
    await initializeModel();
    
    if (!session) {
      // Use mock if model not available
      return mockSentimentAnalysis(text);
    }

    // Tokenize text (simplified - in production use proper tokenizer)
    // This is a placeholder - actual implementation would use the model's tokenizer
    const tokens = text.split(/\s+/).slice(0, 256); // Limit to 256 tokens
    
    // Prepare input tensor
    // Note: This is simplified - actual FinBERT requires proper tokenization
    const inputIds = new Array(256).fill(0);
    tokens.forEach((token, i) => {
      if (i < 256) {
        // Simple hash-based token ID (mock)
        inputIds[i] = token.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 10000;
      }
    });

    // Run inference
    const tensor = new ort.Tensor('int64', new BigInt64Array(inputIds.map(BigInt)), [1, 256]);
    const feeds = { input_ids: tensor };
    const results = await session.run(feeds);
    
    // Extract logits and compute probabilities
    const logits = results.logits.data as Float32Array;
    const probs = softmax(logits);
    
    // Map to sentiment (assuming 3 classes: negative, neutral, positive)
    const negScore = probs[0];
    const neuScore = probs[1];
    const posScore = probs[2];
    
    // Calculate weighted score: -1 for negative, 0 for neutral, +1 for positive
    const score = posScore - negScore;
    
    let label: 'positive' | 'negative' | 'neutral';
    if (posScore > negScore && posScore > neuScore) {
      label = 'positive';
    } else if (negScore > posScore && negScore > neuScore) {
      label = 'negative';
    } else {
      label = 'neutral';
    }
    
    return { label, score };
  } catch (error) {
    logger.warn('Sentiment analysis error, using mock', { error, text: text.substring(0, 50) });
    return mockSentimentAnalysis(text);
  }
}

/**
 * Batch process sentiment for multiple texts
 */
export async function analyzeSentiment(texts: string[]): Promise<SentimentResult[]> {
  const results: SentimentResult[] = [];
  
  // Process in batches
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(text => processSentiment(text))
    );
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * Softmax function for probability calculation
 */
function softmax(logits: Float32Array): number[] {
  const max = Math.max(...Array.from(logits));
  const exp = Array.from(logits).map(x => Math.exp(x - max));
  const sum = exp.reduce((a, b) => a + b, 0);
  return exp.map(x => x / sum);
}
