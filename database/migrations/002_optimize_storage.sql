-- Migration: Optimize storage with compression and retention policies
-- This reduces storage by 90%+ for old data and prevents unlimited growth

-- Enable compression on price_history hypertable
-- First, alter table to enable compression
ALTER TABLE price_history SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'market_id, token_id'
);

-- Add compression policy: compress chunks older than 1 hour
-- This keeps recent data fast for queries, compresses old data to save space
SELECT add_compression_policy('price_history', INTERVAL '1 hour', if_not_exists => TRUE);

-- Optional: Set up continuous aggregates for long-term storage
-- This creates pre-aggregated 1-minute averages for data older than 1 day
-- (Uncomment if you want to keep long-term aggregated data)

-- CREATE MATERIALIZED VIEW price_history_1min
-- WITH (timescaledb.continuous) AS
-- SELECT 
--   time_bucket('1 minute', time) AS bucket,
--   market_id,
--   token_id,
--   AVG(best_bid) AS avg_bid,
--   MAX(best_bid) AS max_bid,
--   MIN(best_bid) AS min_bid,
--   AVG(best_ask) AS avg_ask
-- FROM price_history
-- GROUP BY bucket, market_id, token_id;

-- Add refresh policy for continuous aggregate (if using above)
-- SELECT add_continuous_aggregate_policy('price_history_1min',
--   start_offset => INTERVAL '1 day',
--   end_offset => INTERVAL '1 hour',
--   schedule_interval => INTERVAL '1 hour',
--   if_not_exists => TRUE);

-- Retention policy: Delete data older than 90 days
-- (Adjust INTERVAL as needed - 90 days = ~3 months of history)
-- Uncomment when ready to enable automatic cleanup:
-- SELECT add_retention_policy('price_history', INTERVAL '90 days', if_not_exists => TRUE);

-- Check compression status (run this after data has been compressed)
-- SELECT 
--   chunk_name,
--   pg_size_pretty(total_bytes) as size,
--   is_compressed
-- FROM timescaledb_information.chunks
-- WHERE hypertable_name = 'price_history'
-- ORDER BY chunk_name DESC
-- LIMIT 10;

