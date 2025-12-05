-- Railway TimescaleDB Migration
-- Copy and paste this entire file into Railway's database console
-- Or use Railway's "Query" / "Data" tab if available

-- Enable TimescaleDB extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Create price_history table
CREATE TABLE IF NOT EXISTS price_history (
  time TIMESTAMPTZ NOT NULL,
  market_id TEXT NOT NULL,
  token_id TEXT NOT NULL,
  up_price DECIMAL(10,4),
  down_price DECIMAL(10,4),
  best_bid DECIMAL(10,4),
  best_ask DECIMAL(10,4),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (time, market_id, token_id)
);

-- Convert to hypertable (TimescaleDB optimization)
-- This enables automatic partitioning by time
SELECT create_hypertable('price_history', 'time', if_not_exists => TRUE);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_price_history_market_time 
  ON price_history (market_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_price_history_token_time 
  ON price_history (token_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_price_history_time 
  ON price_history (time DESC);

-- Verify it worked
SELECT 'Migration completed! price_history table created.' as status;
