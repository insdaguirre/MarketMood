# ONNX Models Setup

## Current Status

The application is currently using **mock implementations** for sentiment analysis and embeddings because the ONNX model files are not present in the `backend/models/` directory.

### Why Mock Models?

The code gracefully falls back to mock implementations when models are not found:
- **FinBERT** (sentiment): Uses keyword-based sentiment analysis
- **e5-small** (embeddings): Uses hash-based deterministic embeddings

This allows the application to work without ML models, but results are less accurate than using real models.

## Adding Real Models

To use real ONNX models for better accuracy:

### 1. Download Models

You need to download and convert the models to ONNX format:

**FinBERT (Sentiment Analysis)**
- Original: [ProsusAI/finbert](https://huggingface.co/ProsusAI/finbert)
- Convert to ONNX using HuggingFace's `optimum` library
- Place as: `backend/models/finbert.onnx`

**e5-small (Embeddings)**
- Original: [intfloat/e5-small](https://huggingface.co/intfloat/e5-small)
- Convert to ONNX using HuggingFace's `optimum` library
- Place as: `backend/models/e5-small.onnx`

### 2. Model Conversion Example

```bash
# Install optimum
pip install optimum[onnxruntime]

# Convert FinBERT
optimum-cli export onnx --model ProsusAI/finbert --task text-classification backend/models/

# Convert e5-small
optimum-cli export onnx --model intfloat/e5-small --task feature-extraction backend/models/
```

### 3. Update Dockerfile

Ensure models are copied to the Docker image:

```dockerfile
COPY backend/models/ /app/models/
```

### 4. Verify

After adding models, check Railway logs for:
- `FinBERT model loaded` (instead of "model not found")
- `e5-small embedding model loaded` (instead of "model not found")

## Model Requirements

- **FinBERT**: Expects tokenized input (256 tokens max)
- **e5-small**: Expects text with "query: " prefix, 512 tokens max
- Both models should be INT8 quantized for smaller size and faster inference

## Current Implementation

The code in `backend/src/ingest/sentiment.ts` and `backend/src/ingest/embed.ts` will automatically:
1. Try to load the ONNX model
2. If not found, log a warning and use mock implementation
3. Continue processing without errors

This allows the application to work in MVP mode without models, but you'll get better results with real models.

