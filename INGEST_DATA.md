# How to Ingest Data

## Quick Start

### 1. Set Up Ticker Tiers

First, you need to configure which tickers to ingest. In Railway, add the `TICKER_TIERS_JSON` environment variable:

```json
{
  "T0": ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA"],
  "T1": ["NVDA", "META", "NFLX", "DIS", "JPM"],
  "T2": ["BAC", "WMT", "V", "MA", "PG"],
  "T3": []
}
```

**To add this in Railway:**
1. Go to Railway → Your backend service → Variables
2. Add new variable: `TICKER_TIERS_JSON`
3. Paste the JSON above (or customize with your own tickers)
4. Save

### 2. Make Sure API Keys Are Set

The ingestion uses these APIs (all optional, but more keys = more data):
- `FINNHUB_API_KEY` - For Finnhub news
- `REDDIT_CLIENT_ID` & `REDDIT_CLIENT_SECRET` - For Reddit posts
- `NEWSAPI_KEY` - For NewsAPI articles
- `STOCKTWITS_TOKEN` - For Stocktwits sentiment

**Note:** If API keys aren't set, those sources will be skipped (no error).

### 3. Set Admin Key

Make sure `ADMIN_KEY` is set in Railway environment variables. This is required to call the ingestion endpoint.

### 4. Trigger Ingestion

#### Option A: Manual Trigger (via curl)

```bash
curl -X POST \
  -H "X-ADMIN-KEY: your_admin_key_here" \
  "https://your-railway-url.up.railway.app/admin/ingest?tier=T0"
```

Replace:
- `your_admin_key_here` with your actual `ADMIN_KEY` value
- `your-railway-url.up.railway.app` with your Railway domain

#### Option B: Using Railway CLI

```bash
railway run --service MarketMood -- curl -X POST \
  -H "X-ADMIN-KEY: $ADMIN_KEY" \
  "$RAILWAY_PUBLIC_DOMAIN/admin/ingest?tier=T0"
```

#### Option C: Set Up Cron Jobs (Automated)

In Railway dashboard:
1. Go to your project
2. Click "+ New" → "Cron Job"
3. Create these cron jobs:

**T0 Ingestion (every 10 minutes):**
- Schedule: `*/10 * * * *`
- Command: 
  ```bash
  curl -X POST -H "X-ADMIN-KEY: $ADMIN_KEY" $RAILWAY_PUBLIC_DOMAIN/admin/ingest?tier=T0
  ```

**T1 Ingestion (every 30 minutes):**
- Schedule: `*/30 * * * *`
- Command:
  ```bash
  curl -X POST -H "X-ADMIN-KEY: $ADMIN_KEY" $RAILWAY_PUBLIC_DOMAIN/admin/ingest?tier=T1
  ```

**T2 Ingestion (every 2 hours):**
- Schedule: `0 */2 * * *`
- Command:
  ```bash
  curl -X POST -H "X-ADMIN-KEY: $ADMIN_KEY" $RAILWAY_PUBLIC_DOMAIN/admin/ingest?tier=T2
  ```

**Retention Cleanup (hourly):**
- Schedule: `0 * * * *`
- Command:
  ```bash
  curl -X POST -H "X-ADMIN-KEY: $ADMIN_KEY" $RAILWAY_PUBLIC_DOMAIN/admin/retention
  ```

## What Happens During Ingestion

1. **Fetches Data** from all configured sources (Finnhub, Reddit, NewsAPI, Stocktwits)
2. **Deduplicates** items based on URL
3. **Analyzes Sentiment** using FinBERT model
4. **Generates Embeddings** using e5-small model for vector search
5. **Saves to Database** as snapshots and embeddings

## Verify Ingestion Worked

After running ingestion, test the API:

```bash
curl "https://your-railway-url.up.railway.app/api/sentiment?ticker=AAPL"
```

You should see data in the `snapshots` array instead of an empty array.

## Troubleshooting

**Error: "No tickers configured for tier T0"**
- Make sure `TICKER_TIERS_JSON` is set in Railway environment variables
- Check the JSON format is valid

**Error: "Unauthorized" or 401**
- Make sure `ADMIN_KEY` is set
- Use the correct header: `X-ADMIN-KEY: your_key`

**No data after ingestion:**
- Check Railway logs for errors
- Verify API keys are set (if you want data from those sources)
- Some sources may return empty results if there's no recent news

**Ingestion takes a long time:**
- This is normal - it processes multiple tickers and sources
- Check Railway logs to see progress

## Example Response

Successful ingestion returns:
```json
{
  "tier": "T0",
  "tickersProcessed": 5,
  "items": 42,
  "snapshotsUpserted": 8
}
```

This means:
- Processed 5 tickers
- Found 42 unique items across all sources
- Created 8 sentiment snapshots (grouped by source)

