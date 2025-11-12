import * as ort from 'onnxruntime-node';
import { logger } from '../config/logger';
import { EmbeddingResult } from '../types/api';
import { readFileSync } from 'fs';
import { join } from 'path';

const EMBEDDING_DIM = 384;
let session: ort.InferenceSession | null = null;

/**
 * Initialize e5-small embedding model
 * Note: In production, download the ONNX model and place it in backend/models/
 */
async function initializeModel(): Promise<ort.InferenceSession> {
  if (session) {
    return session;
  }

  try {
    const modelPath = join(__dirname, '../../models/e5-small.onnx');
    
    try {
      session = await ort.InferenceSession.create(modelPath);
      logger.info('e5-small embedding model loaded');
    } catch (error) {
      logger.warn({ error }, 'e5-small model not found, using mock embeddings');
    }

    return session!;
  } catch (error) {
    logger.error({ error }, 'Failed to initialize e5-small model');
    throw error;
  }
}

/**
 * Generate mock embedding for development when model is not available
 */
function generateMockEmbedding(text: string): number[] {
  // Generate deterministic pseudo-random vector based on text hash
  const hash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const embedding: number[] = [];
  
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    const seed = hash + i;
    const value = Math.sin(seed) * 0.5;
    embedding.push(value);
  }
  
  // Normalize
  return normalize(embedding);
}

/**
 * Normalize vector to unit length
 */
function normalize(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude === 0) return vector;
  return vector.map(val => val / magnitude);
}

/**
 * Preprocess text for embedding
 */
function preprocessText(text: string): string {
  // Add query prefix for e5-small (it expects "query: " prefix)
  return `query: ${text}`.substring(0, 512); // Limit length
}

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  try {
    await initializeModel();
    
    if (!session) {
      // Use mock if model not available
      const vector = generateMockEmbedding(text);
      return { vector, text };
    }

    // Preprocess text
    const processedText = preprocessText(text);
    
    // Tokenize (simplified - in production use proper tokenizer)
    // This is a placeholder - actual e5-small requires proper tokenization
    const tokens = processedText.split(/\s+/).slice(0, 512);
    
    // Prepare input tensor
    const inputIds = new Array(512).fill(0);
    tokens.forEach((token, i) => {
      if (i < 512) {
        // Simple hash-based token ID (mock)
        inputIds[i] = token.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 10000;
      }
    });

    // Run inference
    const tensor = new ort.Tensor('int64', new BigInt64Array(inputIds.map(BigInt)), [1, 512]);
    const feeds = { input_ids: tensor };
    const results = await session.run(feeds);
    
    // Extract embedding (assuming output is named 'last_hidden_state' or 'pooler_output')
    const embeddingTensor = results.embedding || results.last_hidden_state || results.pooler_output;
    const embedding = Array.from(embeddingTensor.data as Float32Array);
    
    // Normalize
    const normalized = normalize(embedding);
    
    return { vector: normalized, text };
  } catch (error) {
    logger.warn({ error, text: text.substring(0, 50) }, 'Embedding generation error, using mock');
    const vector = generateMockEmbedding(text);
    return { vector, text };
  }
}

/**
 * Batch generate embeddings
 */
export async function generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
  return Promise.all(texts.map(text => generateEmbedding(text)));
}
