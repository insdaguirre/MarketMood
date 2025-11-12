# 90-Minute Quick Start

## 1. Create .env Files (5 min)

```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with your API keys

# Frontend  
cd ../frontend
cp .env.example .env
# Keep default for local dev
```

## 2. Get API Keys (15 min)

**Quick signups:**
- Finnhub: https://finnhub.io/register (instant)
- NewsAPI: https://newsapi.org/register (instant)
- Reddit: https://www.reddit.com/prefs/apps (create "script" app)
- OpenAI: https://platform.openai.com/api-keys (instant)

**Generate secrets:**
```bash
# JWT_SECRET
openssl rand -hex 32

# ADMIN_KEY
openssl rand -hex 16
```

## 3. Set Up Databases (10 min)

### Neon Postgres
1. https://neon.tech → Sign up → New project
2. Copy connection string → Add to `backend/.env` as `POSTGRES_URL`
3. Run in Neon SQL Editor:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Upstash Redis
1. https://upstash.com → Sign up → Create database
2. Copy REST URL → Add to `backend/.env` as `REDIS_URL`

## 4. Run Migrations Locally (5 min)

```bash
cd backend
npm install
# Set POSTGRES_URL in .env first!
npm run db:migrate
```

## 5. Deploy to Railway (20 min)

1. **Connect GitHub:**
   - Go to https://railway.app
   - New Project → Deploy from GitHub
   - Select MarketMood repo

2. **Add Environment Variables:**
   - Service → Variables tab
   - Copy ALL from `backend/.env`
   - Add each as separate variable

3. **Add Postgres:**
   - + New → Database → PostgreSQL
   - Railway auto-creates `POSTGRES_URL`

4. **Set Root Directory:**
   - Settings → Root Directory: `backend`

5. **Deploy:**
   - Railway auto-deploys on push
   - Or: Manual deploy from dashboard

6. **Run Migrations:**
   ```bash
   railway run npm run db:migrate
   ```

## 6. Set Up Cron Jobs (10 min)

In Railway, create 4 cron jobs:

**T0 (every 10 min):**
```
*/10 * * * *
curl -X POST -H "X-ADMIN-KEY: $ADMIN_KEY" $RAILWAY_PUBLIC_DOMAIN/admin/ingest?tier=T0
```

**T1 (every 30 min):**
```
*/30 * * * *
curl -X POST -H "X-ADMIN-KEY: $ADMIN_KEY" $RAILWAY_PUBLIC_DOMAIN/admin/ingest?tier=T1
```

**Retention (hourly):**
```
0 * * * *
curl -X POST -H "X-ADMIN-KEY: $ADMIN_KEY" $RAILWAY_PUBLIC_DOMAIN/admin/retention
```

Replace `$RAILWAY_PUBLIC_DOMAIN` with your actual URL.

## 7. Deploy Frontend (10 min)

### Option A: Cloudflare Pages
1. Build: `cd frontend && npm install && npm run build`
2. Cloudflare Dashboard → Pages → Upload `frontend/dist`
3. Add env var: `VITE_API_BASE_URL` = Railway URL

### Option B: Railway (Simpler)
1. Add new service in Railway project
2. Root Directory: `frontend`
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Add env var: `VITE_API_BASE_URL` = backend Railway URL

## 8. Test (5 min)

```bash
# Health check
curl https://your-app.up.railway.app/healthz

# Test sentiment
curl "https://your-app.up.railway.app/api/sentiment?ticker=AAPL"

# Manual ingestion
curl -X POST -H "X-ADMIN-KEY: your_key" \
  https://your-app.up.railway.app/admin/ingest?tier=T0
```

## Troubleshooting

**Backend errors:**
- Check Railway logs
- Verify all env vars set
- Run migrations: `railway run npm run db:migrate`

**Frontend can't connect:**
- Check `VITE_API_BASE_URL` matches Railway URL
- Verify backend is running

**Database errors:**
- Ensure pgvector enabled: `CREATE EXTENSION vector;`
- Check connection string format

## Time-Saving Tips

- Skip Stocktwits (optional)
- Use Railway Postgres instead of Neon (faster setup)
- Deploy frontend later, test backend first
- Mock sentiment works if ONNX models missing

## Done! 🎉

Your app should be live at:
- Backend: `https://your-app.up.railway.app`
- Frontend: Your Cloudflare/Railway frontend URL
