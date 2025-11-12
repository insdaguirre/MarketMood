# Ticker Configuration - What You Need to Know

## Default Tickers (Already Implemented)

The system now has **40 default tickers** hardcoded across 4 tiers, exactly as specified in the roadmap:

### T0 (10 tickers - Highest Priority)
- AAPL, MSFT, GOOGL, AMZN, TSLA, NVDA, META, NFLX, DIS, JPM

### T1 (10 tickers)
- BAC, WMT, V, MA, PG, JNJ, UNH, HD, PYPL, ADBE

### T2 (10 tickers)
- CRM, INTC, AMD, NKE, SBUX, COST, TMO, ABBV, AVGO, QCOM

### T3 (10 tickers)
- CSCO, ORCL, IBM, TXN, AMGN, HON, RTX, LOW, UPS, CAT

## How It Works

1. **If `TICKER_TIERS_JSON` is NOT set in Railway:**
   - System uses the default 40 tickers above
   - No configuration needed!

2. **If `TICKER_TIERS_JSON` IS set in Railway:**
   - System uses your custom tickers
   - Missing tiers fall back to defaults

## What You Need to Do

### Option 1: Use Defaults (Easiest)
**Nothing!** Just trigger ingestion:
```bash
curl -X POST \
  -H "X-ADMIN-KEY: your_admin_key" \
  "https://your-railway-url.up.railway.app/admin/ingest?tier=T0"
```

### Option 2: Customize Tickers
If you want different tickers, set `TICKER_TIERS_JSON` in Railway:
```json
{
  "T0": ["AAPL", "MSFT", "GOOGL"],
  "T1": ["NVDA", "META"],
  "T2": ["TSLA"],
  "T3": []
}
```

## Next Steps

1. **Trigger ingestion** - The defaults are ready to use
2. **Check Railway logs** - See which tickers are being processed
3. **Test the API** - Query sentiment for any of the 40 default tickers

The system is ready to go with the 40 tickers from your roadmap!

