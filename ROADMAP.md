# RAG Stock Sentiment (Lightweight) — Development Roadmap

## 🎯 Project Overview

**Goal**: Build a lightweight RAG-based stock sentiment analysis system that tracks 40 tickers across 4 tiers with 1-day retention, running entirely on Railway with external free services.

**Budget Target**: ≤ $15/month on Railway; everything else on free tiers

## 📋 MVP Goals

- [ ] Track 40 tickers in 4 tiers (T0–T3) with 1-day retention
- [ ] Ingest headlines/social from Finnhub, Reddit, NewsAPI, Stocktwits
- [ ] Compute sentiment snapshots (per ticker/source), no full article storage
- [ ] Embed snapshots → pgvector (Postgres/Neon free tier)
- [ ] Expose `/sentiment` (latest per ticker) + `/ask` (RAG-style Q&A; 24h window)
- [ ] Run everything as one Railway service (API + Cron handlers) + free external services

## 🏗️ Architecture Overview

```
React FE (Cloudflare Pages) → Railway "sentirag" (Node/Express)
                                           │
                                           ├── Neon Postgres (pgvector)
                                           ├── Upstash Redis (cache, rate-limit)
                                           └── External APIs (Finnhub, Reddit, NewsAPI, Stocktwits)
```

## 📅 Development Phases

### Phase 1: Foundation Setup (Week 1)
**Priority**: Critical

#### Infrastructure & Environment
- [ ] Set up Railway project: `sentirag`
- [ ] Configure Neon Postgres with pgvector extension
- [ ] Set up Upstash Redis instance
- [ ] Configure environment variables and secrets
- [ ] Set up Cloudflare Pages for frontend

#### Database Schema
- [ ] Create database migrations
  - [ ] `000_init.sql` - Basic setup
  - [ ] `010_pgvector.sql` - Vector extension
  - [ ] `020_schema.sql` - Full schema (Users, Orgs, Snapshots, Embeddings, etc.)
- [ ] Implement retention policies (24h cleanup)
- [ ] Set up database indexes for performance

#### Project Structure
- [ ] Initialize Node.js project with TypeScript
- [ ] Set up directory structure:
  ```
  /app/src/
    /config/     # env.ts, logger.ts, rateLimit.ts
    /db/         # pg.ts, redis.ts, sql/
    /ingest/     # Data fetching and processing
    /retrieval/  # Vector search and ranking
    /routes/     # API endpoints
    /llm/        # LLM integration
    /utils/      # Helper functions
  ```

### Phase 2: Core Ingestion Pipeline (Week 2)
**Priority**: Critical

#### Data Sources Integration
- [ ] **Finnhub API**
  - [ ] Implement `fetchFinnhub.ts`
  - [ ] Handle rate limiting and error handling
  - [ ] Cache responses in Redis (15-30 min TTL)

- [ ] **Reddit API**
  - [ ] Implement `fetchReddit.ts`
  - [ ] Set up OAuth2 authentication
  - [ ] Fetch relevant stock discussions

- [ ] **NewsAPI**
  - [ ] Implement `fetchNewsAPI.ts`
  - [ ] Handle pagination and filtering
  - [ ] Focus on financial news sources

- [ ] **Stocktwits API**
  - [ ] Implement `fetchStocktwits.ts`
  - [ ] Handle authentication and rate limits

#### Data Processing
- [ ] **Deduplication**
  - [ ] Implement `dedup.ts` with hash-based deduplication
  - [ ] Use title|url|first_200 chars for hash generation

- [ ] **Sentiment Analysis**
  - [ ] Integrate FinBERT ONNX model (INT8 quantized)
  - [ ] Implement batch processing (64-128 items)
  - [ ] Map sentiment scores: pos≈+1, neg≈-1, neu≈0

- [ ] **Embedding Generation**
  - [ ] Integrate e5-small ONNX model (INT8 quantized)
  - [ ] Generate 384-dimensional vectors
  - [ ] Normalize vectors for cosine similarity

- [ ] **Aggregation**
  - [ ] Implement `aggregate.ts` for snapshot creation
  - [ ] Calculate mean_score, pos_ratio, neg_ratio, neu_ratio
  - [ ] Extract top mentions with URLs

### Phase 3: API Development (Week 3)
**Priority**: Critical

#### Core API Endpoints
- [ ] **Health Check**
  - [ ] `GET /healthz` - Service health status

- [ ] **Sentiment Endpoint**
  - [ ] `GET /sentiment?ticker=AAPL` - Latest sentiment data
  - [ ] Support optional `sinceMinutes` parameter
  - [ ] Return structured JSON with snapshots by source

- [ ] **RAG Query Endpoint**
  - [ ] `POST /ask` - RAG-style Q&A
  - [ ] Implement vector search with pgvector KNN
  - [ ] Generate grounded responses with citations
  - [ ] Cache answers in Redis (30 min TTL)

#### Admin Endpoints
- [ ] **Ingestion Control**
  - [ ] `POST /admin/ingest?tier=T0` - Trigger tier-specific ingestion
  - [ ] Implement tier-based ticker processing
  - [ ] Add admin authentication (X-ADMIN-KEY header)

- [ ] **Maintenance**
  - [ ] `POST /admin/retention` - Clean up old data
  - [ ] `POST /admin/reindex` - Rebuild embeddings (if needed)

#### Authentication & Security
- [ ] Implement JWT authentication (minimal for MVP)
- [ ] Add rate limiting per IP and per organization
- [ ] Implement quota management
- [ ] Sanitize inputs and validate ticker allowlists

### Phase 4: Cron Jobs & Automation (Week 4)
**Priority**: High

#### Railway Cron Configuration
- [ ] **Tier-based Ingestion**
  - [ ] T0: Every 10 minutes (high-priority tickers)
  - [ ] T1: Every 30 minutes
  - [ ] T2: Every 2 hours
  - [ ] T3: Every 6 hours

- [ ] **Maintenance Jobs**
  - [ ] Retention cleanup: Every hour
  - [ ] Health monitoring: Every minute

#### Error Handling & Monitoring
- [ ] Implement exponential backoff for API failures
- [ ] Add structured logging for all operations
- [ ] Set up basic metrics collection
- [ ] Implement circuit breakers for external APIs

### Phase 5: Frontend Development (Week 5)
**Priority**: Medium

#### React Frontend (Cloudflare Pages)
- [ ] Set up React project with TypeScript
- [ ] Implement sentiment visualization components
- [ ] Create RAG query interface
- [ ] Add ticker selection and filtering
- [ ] Implement responsive design
- [ ] Add loading states and error handling

#### Key Features
- [ ] Real-time sentiment charts
- [ ] Interactive Q&A interface
- [ ] Citation display with source links
- [ ] Ticker search and selection
- [ ] Mobile-responsive design

### Phase 6: Testing & Optimization (Week 6)
**Priority**: High

#### Testing Strategy
- [ ] **Unit Tests**
  - [ ] Sentiment mapping accuracy
  - [ ] Embedding generation and normalization
  - [ ] Deduplication hash stability
  - [ ] SQL upserts and KNN queries

- [ ] **Integration Tests**
  - [ ] End-to-end ingestion pipeline
  - [ ] API endpoint functionality
  - [ ] Database operations
  - [ ] External API integrations

- [ ] **Load Testing**
  - [ ] Simulate 20 parallel `/ask` requests
  - [ ] Target p95 latency < 700ms (excluding LLM)
  - [ ] Test rate limiting and quota enforcement

#### Performance Optimization
- [ ] Optimize database queries and indexes
- [ ] Implement efficient caching strategies
- [ ] Optimize ONNX model inference
- [ ] Fine-tune vector search parameters

### Phase 7: Deployment & Monitoring (Week 7)
**Priority**: Critical

#### Production Deployment
- [ ] Deploy to Railway with proper configuration
- [ ] Set up environment variables and secrets
- [ ] Configure Railway Cron jobs
- [ ] Deploy frontend to Cloudflare Pages
- [ ] Set up custom domain (if needed)

#### Monitoring & Alerts
- [ ] Set up Railway spend alerts (80% of $15 budget)
- [ ] Configure uptime monitoring
- [ ] Set up error tracking and logging
- [ ] Monitor API response times and success rates

#### Rollout Checklist
- [ ] Provision and configure all external services
- [ ] Run database migrations
- [ ] Deploy API service and verify `/healthz`
- [ ] Add and test Railway Cron jobs
- [ ] Smoke test ingestion pipeline
- [ ] Validate API endpoints with real data
- [ ] Deploy and test frontend
- [ ] Set up monitoring and alerts

## 🔧 Technical Implementation Details

### Data Model
- **Users & Organizations**: Basic multi-tenant structure
- **Snapshots**: 1-day retention with sentiment metrics
- **Embeddings**: 384-dimensional vectors for RAG
- **Usage Tracking**: Quota management and analytics

### Key Technologies
- **Backend**: Node.js 18+, Express, TypeScript
- **Database**: Neon Postgres with pgvector
- **Cache**: Upstash Redis
- **ML Models**: FinBERT + e5-small (ONNX INT8)
- **Deployment**: Railway (API) + Cloudflare Pages (Frontend)

### Rate Limiting & Quotas
- `/ask`: 60/min/IP (public), 600/day/org
- `/sentiment`: 120/min/IP
- Per-organization daily limits based on plan

## 🚀 Post-MVP Roadmap (V1 Backlog)

### Authentication & Multi-tenancy
- [ ] Full JWT authentication system
- [ ] User registration and management
- [ ] Organization-based access control
- [ ] API key management

### Enhanced Retrieval
- [ ] BM25 hybrid search (optional)
- [ ] Cross-encoder reranking
- [ ] Per-source weighting (news > social)
- [ ] Advanced filtering options

### Analytics & Insights
- [ ] Price overlay integration (Yahoo/Polygon)
- [ ] Sentiment vs. return correlation analysis
- [ ] Historical trend analysis
- [ ] Custom dashboard creation

### Extended Retention
- [ ] Weekly mode (7-day retention)
- [ ] Configurable retention periods
- [ ] Data export capabilities
- [ ] Historical data analysis

## 📊 Success Metrics

### Performance Targets
- API response time: p95 < 700ms (excluding LLM)
- Ingestion latency: < 5 minutes per tier
- Uptime: > 99.5%
- Cost: ≤ $15/month on Railway

### Quality Metrics
- Sentiment accuracy: > 80% (validated against manual samples)
- RAG answer relevance: > 85% (user feedback)
- Data freshness: < 10 minutes for T0 tickers
- Cache hit rate: > 60% for repeated queries

## 🛡️ Risk Mitigation

### Technical Risks
- **External API failures**: Implement circuit breakers and fallbacks
- **Model performance**: Use quantized models and batch processing
- **Database growth**: Implement aggressive retention policies
- **Cost overruns**: Set up monitoring and automatic scaling limits

### Operational Risks
- **Data quality**: Implement validation and error handling
- **Rate limiting**: Use Redis-based sliding windows
- **Security**: Input sanitization and authentication
- **Monitoring**: Comprehensive logging and alerting

## 📝 Notes

- All external services should use free tiers initially
- Focus on lightweight, efficient implementations
- Prioritize reliability over feature completeness for MVP
- Use ONNX models for consistent, fast inference
- Implement comprehensive caching to reduce costs
- Monitor costs closely and set up alerts

---

**Last Updated**: January 2025  
**Next Review**: Weekly during development  
**Status**: Planning Phase
