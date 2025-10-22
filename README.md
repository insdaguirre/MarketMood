# MarketMood - RAG Stock Sentiment Analysis

A lightweight, real-time stock sentiment analysis system that aggregates data from multiple sources and provides AI-powered insights through a RAG (Retrieval-Augmented Generation) architecture.

## 🎯 Overview

MarketMood tracks sentiment across 40+ stock tickers in 4 priority tiers, ingesting data from news, social media, and financial APIs. The system processes this data through sentiment analysis and vector embeddings, enabling intelligent Q&A about market sentiment.

## 🏗️ Architecture

```mermaid
graph TB
    %% External Data Sources
    subgraph "Data Sources"
        FH[Finnhub API<br/>Financial News]
        RD[Reddit API<br/>r/stocks, r/investing]
        NA[NewsAPI<br/>Financial Headlines]
        ST[Stocktwits API<br/>Social Sentiment]
    end

    %% Frontend
    subgraph "Frontend"
        CF[Cloudflare Pages<br/>React Frontend]
    end

    %% Main Application
    subgraph "Railway Service - sentirag"
        subgraph "API Layer"
            API[Express.js API<br/>/sentiment, /ask, /healthz]
            AUTH[JWT Authentication<br/>Rate Limiting]
        end
        
        subgraph "Ingestion Pipeline"
            FETCH[Data Fetchers<br/>Finnhub, Reddit, NewsAPI, Stocktwits]
            DEDUP[Deduplication<br/>Hash-based filtering]
            SENT[Sentiment Analysis<br/>FinBERT ONNX INT8]
            EMBED[Embedding Generation<br/>e5-small ONNX INT8]
            AGG[Aggregation<br/>Snapshot creation]
        end
        
        subgraph "Cron Jobs"
            CRON[Railway Cron<br/>T0: 10min, T1: 30min<br/>T2: 2h, T3: 6h]
        end
    end

    %% Data Storage
    subgraph "Data Storage"
        PG[(Neon Postgres<br/>pgvector enabled)]
        REDIS[(Upstash Redis<br/>Cache & Rate Limiting)]
    end

    %% AI/ML Processing
    subgraph "AI Processing"
        LLM[LLM Provider<br/>GPT-3.5-turbo]
        VEC[Vector Search<br/>pgvector KNN]
    end

    %% Data Flow Connections
    FH --> FETCH
    RD --> FETCH
    NA --> FETCH
    ST --> FETCH
    
    FETCH --> DEDUP
    DEDUP --> SENT
    SENT --> EMBED
    EMBED --> AGG
    
    AGG --> PG
    FETCH --> REDIS
    
    CRON --> FETCH
    
    CF --> API
    API --> AUTH
    API --> VEC
    API --> LLM
    
    VEC --> PG
    AUTH --> REDIS
    API --> REDIS
    
    %% Styling
    classDef dataSource fill:#e1f5fe
    classDef frontend fill:#f3e5f5
    classDef api fill:#e8f5e8
    classDef storage fill:#fff3e0
    classDef ai fill:#fce4ec
    
    class FH,RD,NA,ST dataSource
    class CF frontend
    class API,AUTH,FETCH,DEDUP,SENT,EMBED,AGG,CRON api
    class PG,REDIS storage
    class LLM,VEC ai
```

## 🔄 Information Flow

### 1. **Data Ingestion** (Cron-driven)
- **Railway Cron** triggers ingestion based on ticker tier priority
- **Data Fetchers** collect headlines and social posts from external APIs
- **Deduplication** removes duplicate content using hash-based filtering
- **Caching** stores raw API responses in Redis (15-30 min TTL)

### 2. **Processing Pipeline**
- **Sentiment Analysis**: FinBERT model processes text → sentiment scores
- **Embedding Generation**: e5-small model creates 384-dim vectors
- **Aggregation**: Creates snapshots with mean scores, ratios, and top mentions
- **Storage**: Snapshots and embeddings stored in Postgres with pgvector

### 3. **Query Processing**
- **Vector Search**: User queries embedded and matched against stored vectors
- **Retrieval**: KNN search returns most relevant snippets (24h window)
- **LLM Synthesis**: GPT-3.5 generates grounded responses with citations
- **Caching**: Answers cached in Redis (30 min TTL)

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js
- **ML Models**: FinBERT + e5-small (ONNX INT8 quantized)
- **Deployment**: Railway

### Data Storage
- **Primary DB**: Neon Postgres with pgvector extension
- **Cache**: Upstash Redis
- **Vector Search**: pgvector HNSW indexes

### Frontend
- **Framework**: React with TypeScript
- **Hosting**: Cloudflare Pages
- **Features**: Real-time charts, Q&A interface, citation display

### External APIs
- **Financial**: Finnhub (news, sentiment)
- **Social**: Reddit (r/stocks, r/investing)
- **News**: NewsAPI (financial headlines)
- **Social Trading**: Stocktwits (sentiment)

## 🎯 Key Features

- **Real-time Sentiment**: Track 40+ tickers across 4 priority tiers
- **Multi-source Data**: News, Reddit, Stocktwits, Finnhub
- **AI-powered Q&A**: RAG-based responses with citations
- **Cost-effective**: ≤$15/month on Railway + free external services
- **Lightweight**: No long-running workers, cron-based ingestion
- **Scalable**: Vector search with pgvector, Redis caching

## 📈 Performance Targets

- **API Response**: p95 < 700ms (excluding LLM)
- **Ingestion Latency**: < 5 minutes per tier
- **Uptime**: > 99.5%
- **Cost**: ≤ $15/month on Railway

