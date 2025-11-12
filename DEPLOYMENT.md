# Quick Deployment Guide (90-Minute Setup)

## Step 1: Set Up Environment Variables (10 minutes)

### Create Backend .env File

1. Copy the example file:
```bash
cd backend
cp .env.example .env
```

2. Edit `backend/.env` and fill in your API keys:

**Required API Keys:**
- **Finnhub**: Get free key at https://finnhub.io/register
- **Reddit**: Create app at https://www.reddit.com/prefs/apps (script type)
- **NewsAPI**: Get free key at https://newsapi.org/register
- **Stocktwits**: Optional - can skip for MVP
- **OpenAI**: Get API key at https://platform.openai.com/api-keys

**Generate Secrets:**
```bash
# Generate JWT_SECRET (32+ chars)
openssl rand -hex 32

# Generate ADMIN_KEY
openssl rand -hex 16
```

### Create Frontend .env File

```bash
cd frontend
cp .env.example .env
```

For local dev, keep `VITE_API_BASE_URL=http://localhost:8080`
For production, set to your Railway backend URL

## Step 2: Set Up External Services (20 minutes)

### Neon Postgres (Free Tier)

1. Go to https://neon.tech
2. Sign up and create a new project
3. Copy the connection string (starts with `postgresql://`)
4. Add to `backend/.env` as `POSTGRES_URL`
5. **Enable pgvector**: In Neon dashboard, go to SQL Editor and run:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Upstash Redis (Free Tier)

1. Go to https://upstash.com
2. Sign up and create a Redis database
3. Copy the REST URL (starts with `rediss://`)
4. Add to `backend/.env` as `REDIS_URL`

### Cloudflare Pages (Free - for Frontend)

1. Go to https://dash.cloudflare.com
2. Sign up/login
3. We'll deploy later after Railway setup

## Step 3: Deploy Backend to Railway (30 minutes)

### Initial Setup

1. Go to https://railway.app
2. Sign up/login with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your `MarketMood` repository
5. Railway will auto-detect the backend

### Configure Railway Service

1. **Add Environment Variables:**
   - Click on your service → Variables tab
   - Add ALL variables from `backend/.env`:
     - Copy each key=value pair
     - In Railway, add as separate variables (don't upload .env file)

2. **Set Build Settings:**
   - Root Directory: `backend`
   - Build Command: `npm run build`
   - Start Command: `npm start`

3. **Add Postgres Plugin:**
   - Click "+ New" → "Database" → "Add PostgreSQL"
   - Railway will auto-create `POSTGRES_URL` variable
   - **IMPORTANT**: Update your `.env` to use Railway's Postgres URL

4. **Run Migrations:**
   - In Railway, go to your service → Deployments
   - Click on the latest deployment → "View Logs"
   - Or use Railway CLI:
   ```bash
   railway run npm run db:migrate
   ```

### Set Up Railway Cron Jobs

1. Go to your Railway project
2. Click "+ New" → "Cron Job"
3. Create 4 cron jobs:

**T0 Ingestion (every 10 min):**
- Schedule: `*/10 * * * *`
- Command: `curl -X POST -H "X-ADMIN-KEY: $ADMIN_KEY" $RAILWAY_PUBLIC_DOMAIN/admin/ingest?tier=T0`

**T1 Ingestion (every 30 min):**
- Schedule: `*/30 * * * *`
- Command: `curl -X POST -H "X-ADMIN-KEY: $ADMIN_KEY" $RAILWAY_PUBLIC_DOMAIN/admin/ingest?tier=T1`

**T2 Ingestion (every 2 hours):**
- Schedule: `0 */2 * * *`
- Command: `curl -X POST -H "X-ADMIN-KEY: $ADMIN_KEY" $RAILWAY_PUBLIC_DOMAIN/admin/ingest?tier=T2`

**Retention Cleanup (hourly):**
- Schedule: `0 * * * *`
- Command: `curl -X POST -H "X-ADMIN-KEY: $ADMIN_KEY" $RAILWAY_PUBLIC_DOMAIN/admin/retention`

**Note**: Replace `$RAILWAY_PUBLIC_DOMAIN` with your actual Railway domain (e.g., `https://your-app.up.railway.app`)

## Step 4: Deploy Frontend to Cloudflare Pages (15 minutes)

### Build Frontend

1. Update `frontend/.env` with your Railway backend URL:
```
VITE_API_BASE_URL=https://your-app.up.railway.app
```

2. Build locally:
```bash
cd frontend
npm install
npm run build
```

### Deploy to Cloudflare Pages

1. Go to Cloudflare Dashboard → Pages
2. Click "Create a project" → "Upload assets"
3. Upload the `frontend/dist` folder
4. Or connect GitHub repo and set:
   - Build command: `cd frontend && npm run build`
   - Build output directory: `frontend/dist`
   - Root directory: `frontend`

5. Add environment variable:
   - `VITE_API_BASE_URL` = your Railway backend URL

## Step 5: Test & Verify (15 minutes)

### Test Backend

1. Check health endpoint:
```bash
curl https://your-app.up.railway.app/healthz
```

2. Test sentiment endpoint:
```bash
curl "https://your-app.up.railway.app/api/sentiment?ticker=AAPL"
```

3. Manually trigger ingestion:
```bash
curl -X POST -H "X-ADMIN-KEY: your_admin_key" \
  https://your-app.up.railway.app/admin/ingest?tier=T0
```

### Test Frontend

1. Visit your Cloudflare Pages URL
2. Try selecting a ticker and viewing sentiment
3. Test the Ask feature

## Quick Troubleshooting

### Backend won't start:
- Check Railway logs for errors
- Verify all environment variables are set
- Ensure Postgres connection string is correct

### Database errors:
- Run migrations: `railway run npm run db:migrate`
- Check pgvector is enabled in Neon

### Frontend can't connect:
- Verify `VITE_API_BASE_URL` is set correctly
- Check CORS settings (should be enabled in backend)
- Verify Railway service is running

### Cron jobs not working:
- Check Railway cron job logs
- Verify `ADMIN_KEY` is set correctly
- Ensure Railway public domain is accessible

## Cost Estimates

- **Railway**: Free tier (500 hours/month) - should be enough for MVP
- **Neon**: Free tier (0.5GB storage)
- **Upstash**: Free tier (10K commands/day)
- **Cloudflare Pages**: Free
- **Total**: $0/month for MVP

## Next Steps After Deployment

1. Monitor Railway usage (stay under free tier)
2. Set up Railway spend alerts
3. Test ingestion pipeline with real data
4. Monitor error logs
5. Fine-tune cron schedules if needed

## Emergency Fallbacks

If you run out of time:
- Skip Stocktwits (make it optional)
- Use mock sentiment/embeddings (already implemented)
- Deploy frontend later, test backend first
- Use Railway's built-in Postgres instead of Neon (simpler)
