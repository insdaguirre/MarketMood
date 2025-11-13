#!/bin/bash

# Test ingestion script
# Usage: ./test-ingestion.sh [tier]
# Example: ./test-ingestion.sh T0

TIER=${1:-T0}
ADMIN_KEY="8dacba1a59a2686f03598f7341d046c6"
RAILWAY_URL="${RAILWAY_PUBLIC_DOMAIN:-https://your-railway-url.up.railway.app}"

echo "Triggering ingestion for tier: $TIER"
echo "URL: $RAILWAY_URL/admin/ingest?tier=$TIER"
echo ""

curl -X POST \
  -H "X-ADMIN-KEY: $ADMIN_KEY" \
  -H "Content-Type: application/json" \
  "$RAILWAY_URL/admin/ingest?tier=$TIER" \
  -v

echo ""
echo ""
echo "Check Railway logs for detailed debugging information:"
echo "  - API key status for each source"
echo "  - Source-level success/failure for each ticker"
echo "  - Detailed error messages"
echo ""
echo "To view logs: railway logs --follow"

