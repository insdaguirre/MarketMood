# Run Database Migrations

## The Problem

The 500 errors you're seeing are because the database tables don't exist yet. The migrations haven't been run.

## Solution: Run Database Migrations

### Option 1: Using Railway CLI (Recommended)

1. **Install Railway CLI** (if not already installed):
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**:
   ```bash
   railway login
   ```

3. **Link to your project** (if not already linked):
   ```bash
   railway link
   ```

4. **Navigate to backend directory and run migrations**:
   ```bash
   cd backend
   railway run npm run db:migrate
   ```
   
   **Important**: You must run this from the `backend` directory, not the root directory!

### Option 2: Using Railway Dashboard

1. Go to your Railway project dashboard
2. Click on your backend service
3. Go to "Deployments" tab
4. Click "New Deployment"
5. In the command field, enter: `npm run db:migrate`
6. Click "Deploy"

### Option 3: Manual SQL (If migrations fail)

If the migration script doesn't work, you can run the SQL manually:

1. Go to your **Neon Postgres** dashboard
2. Click on your database
3. Go to "SQL Editor"
4. Run these SQL files in order:
   - `backend/src/db/sql/000_init.sql`
   - `backend/src/db/sql/010_pgvector.sql`
   - `backend/src/db/sql/020_schema.sql`

## Verify Migrations

After running migrations, test the API:

```bash
curl "https://your-railway-url.up.railway.app/api/sentiment?ticker=AAPL"
```

You should get a response with an empty `snapshots` array (instead of a 500 error):

```json
{
  "ticker": "AAPL",
  "snapshots": [],
  "updatedAt": "2025-11-12T..."
}
```

## Next Steps

After migrations are complete:
1. The API will return empty results (no 500 errors)
2. Run the ingestion cron jobs to populate data:
   ```bash
   curl -X POST -H "X-ADMIN-KEY: your_admin_key" \
     https://your-railway-url.up.railway.app/admin/ingest?tier=T0
   ```
3. Once data is ingested, the sentiment endpoint will return actual data

## Troubleshooting

**If you get "POSTGRES_URL not configured":**
- Make sure `POSTGRES_URL` is set in Railway environment variables
- It should be your Neon Postgres connection string

**If you get connection errors:**
- Verify your Neon Postgres database is running
- Check the connection string is correct
- Make sure the connection string includes `?sslmode=require`

**If migrations fail:**
- Check Railway logs for specific error messages
- Verify pgvector extension is enabled in Neon (run `CREATE EXTENSION IF NOT EXISTS vector;`)

