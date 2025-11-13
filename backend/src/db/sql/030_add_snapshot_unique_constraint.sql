-- Add unique constraint to prevent duplicate snapshots
-- This ensures that ON CONFLICT DO NOTHING works correctly

DO $$ 
BEGIN
    -- First, remove duplicate rows (keep the one with the latest id)
    DELETE FROM "Snapshot" s1
    USING "Snapshot" s2
    WHERE s1.ticker = s2.ticker
      AND s1.source = s2.source
      AND s1.ts = s2.ts
      AND s1.id < s2.id;

    -- Now add the unique constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'snapshot_unique_ticker_source_ts'
    ) THEN
        ALTER TABLE "Snapshot" 
        ADD CONSTRAINT snapshot_unique_ticker_source_ts 
        UNIQUE (ticker, source, ts);
    END IF;
END $$;

