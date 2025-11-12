-- MarketMood Database Initialization
-- This script sets up the basic database structure

-- Ensure we're using UTC timezone
SET timezone = 'UTC';

-- Create extensions if they don't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
