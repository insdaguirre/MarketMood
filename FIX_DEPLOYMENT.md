# Fix Deployment Issues

## Current Problems

1. **Redis Connection**: Upstash REST API credentials won't work with ioredis
2. **500 Errors**: Database connection or query issues
3. **Backend Crashing**: App failing to start

## Solutions

### 1. Fix Redis Connection (Optional - App works without it)

**Problem**: You have Upstash REST API credentials, but the backend uses `ioredis` which requires a TCP connection.

**Solution A: Get Upstash TCP Endpoint (Recommended)**

1. Go to your Upstash Redis dashboard
2. Click on your Redis database
3. Switch to the **"TCP"** tab (not REST)
4. Copy the connection string - it should look like:
   ```
   redis://default:password@host:port
   ```
5. In Railway, update the `REDIS_URL` environment variable with this TCP connection string

**Solution B: Remove Redis (App will work without it)**

1. In Railway, delete or leave empty the `REDIS_URL` environment variable
2. The app will continue to work, but without caching and rate limiting

### 2. Verify Database Connection

**Check PostgreSQL URL:**

1. In Railway, verify `POSTGRES_URL` is set correctly
2. It should look like:
   ```
   postgresql://user:password@host:port/database?sslmode=require
   ```
3. If using Neon Postgres, make sure you're using the connection string from Neon dashboard

**Run Database Migrations:**

If you haven't run migrations yet:

```bash
railway run npm run db:migrate
```

Or in Railway dashboard:
1. Go to your service
2. Click "Deployments" → "New Deployment"
3. Use command: `npm run db:migrate`

### 3. Check Environment Variables

**Required Variables:**
- `POSTGRES_URL` - **REQUIRED** - Database connection string
- `PORT` - Usually auto-set by Railway (8080)

**Optional but Recommended:**
- `REDIS_URL` - For caching (TCP connection string, not REST)
- `OPENAI_API_KEY` - For Q&A feature
- `FINNHUB_API_KEY` - For news data
- `ADMIN_KEY` - For admin endpoints

### 4. Verify Backend is Running

1. Check Railway logs
2. You should see: `Server running on port 8080`
3. Test health endpoint:
   ```bash
   curl https://your-railway-url.up.railway.app/healthz
   ```
4. Should return: `{"status":"ok","timestamp":"..."}`

### 5. Check Logs for Specific Errors

After deploying, check Railway logs for:
- Database connection errors
- Missing environment variables
- Specific error messages

The improved error handling will now show more detailed error messages to help diagnose issues.

## Quick Fix Checklist

- [ ] Verify `POSTGRES_URL` is set in Railway
- [ ] Either set `REDIS_URL` to TCP endpoint OR remove it (app works without Redis)
- [ ] Run database migrations: `railway run npm run db:migrate`
- [ ] Check Railway logs for specific error messages
- [ ] Test health endpoint: `curl https://your-url/healthz`
- [ ] Test sentiment endpoint: `curl "https://your-url/api/sentiment?ticker=AAPL"`

## After Fixes

The app should:
- Start successfully without Redis (if not configured)
- Connect to PostgreSQL database
- Return proper error messages if something is wrong
- Work with frontend once backend is healthy

