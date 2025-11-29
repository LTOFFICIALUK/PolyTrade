-- Migration: Create price_history table with TimescaleDB
-- Run this after TimescaleDB is installed and running

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
-- Index for querying by market and time range
CREATE INDEX IF NOT EXISTS idx_price_history_market_time 
  ON price_history (market_id, time DESC);

-- Index for querying by token and time range
CREATE INDEX IF NOT EXISTS idx_price_history_token_time 
  ON price_history (token_id, time DESC);

-- Index for querying by time range only
CREATE INDEX IF NOT EXISTS idx_price_history_time 
  ON price_history (time DESC);

-- Add comment
COMMENT ON TABLE price_history IS 'Historical price data for Polymarket tokens, partitioned by time for efficient queries';

