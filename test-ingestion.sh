#!/bin/bash

# Test ingestion script
# Usage: ./test-ingestion.sh [tier] [railway-url]
# Example: ./test-ingestion.sh T0
# Example: ./test-ingestion.sh T0 https://your-app.up.railway.app

TIER=${1:-T0}
ADMIN_KEY="8dacba1a59a2686f03598f7341d046c6"

# Try to get Railway URL from environment or use provided argument
if [ -n "$2" ]; then
  RAILWAY_URL="$2"
elif [ -n "$RAILWAY_PUBLIC_DOMAIN" ]; then
  RAILWAY_URL="$RAILWAY_PUBLIC_DOMAIN"
else
  echo "Error: Railway URL not provided"
  echo "Usage: ./test-ingestion.sh [tier] [railway-url]"
  echo "Example: ./test-ingestion.sh T0 https://your-app.up.railway.app"
  exit 1
fi

echo "=========================================="
echo "Triggering ingestion for tier: $TIER"
echo "URL: $RAILWAY_URL/admin/ingest?tier=$TIER"
echo "=========================================="
echo ""

# Trigger ingestion (with timeout and progress)
echo "Sending request (this may take 1-2 minutes for T0 tier with 10 tickers)..."
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" --max-time 120 -X POST \
  -H "X-ADMIN-KEY: $ADMIN_KEY" \
  -H "Content-Type: application/json" \
  "$RAILWAY_URL/admin/ingest?tier=$TIER" 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo "Response:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""
echo "=========================================="
echo "Next steps:"
echo "1. Check Railway logs for detailed debugging:"
echo "   railway logs --follow"
echo ""
echo "2. Look for these log entries:"
echo "   - 'API key status' - Shows which API keys are configured"
echo "   - 'Ticker source status' - Shows success/failure for each source per ticker"
echo "   - 'NewsAPI failed or empty' - Error details for NewsAPI"
echo "   - 'Stocktwits failed or empty' - Error details for Stocktwits"
echo "=========================================="
