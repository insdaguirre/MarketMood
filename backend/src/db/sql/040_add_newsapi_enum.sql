-- Add 'newsapi' to source_enum
-- PostgreSQL doesn't support IF NOT EXISTS on ALTER TYPE ADD VALUE, so we check first

DO $$ 
BEGIN
    -- Check if 'newsapi' already exists in the enum
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_enum 
        WHERE enumlabel = 'newsapi' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'source_enum')
    ) THEN
        -- Add 'newsapi' to the enum
        ALTER TYPE source_enum ADD VALUE 'newsapi';
    END IF;
END $$;

