# Railway TimescaleDB Migration Instructions

Since Railway's internal connection string (`timescaledb.railway.internal`) can only be accessed from within Railway's network, you have a few options:

## Option 1: Railway's Database Console (Easiest)

1. Go to Railway dashboard
2. Click your "timescaledb" service
3. Look for "Data", "Query", "Console", or "Connect" tab
4. Paste and run the SQL from `database/migrations/001_create_price_history.sql`

## Option 2: Use Public Connection String

If Railway provides a public connection string, you can run the migration from your local machine using that.

## Option 3: Railway One-Off Service

Create a temporary service on Railway that runs the migration script.

## Option 4: Manual SQL Execution

Copy the SQL below and run it in Railway's database console:

```sql
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
SELECT create_hypertable('price_history', 'time', if_not_exists => TRUE);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_price_history_market_time 
  ON price_history (market_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_price_history_token_time 
  ON price_history (token_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_price_history_time 
  ON price_history (time DESC);
```
