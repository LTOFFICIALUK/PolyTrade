/**
 * Price recorder for TimescaleDB
 * Records price history without blocking real-time updates
 */

import { Pool } from 'pg'

let pool: Pool | null = null
let isInitialized = false
let migrationRun = false

/**
 * Run database migrations (create tables if they don't exist)
 */
const runMigrations = async (pool: Pool): Promise<void> => {
  if (migrationRun) return
  
  try {
    console.log('[PriceRecorder] Running database migrations...')
    
    // Enable TimescaleDB extension
    await pool.query('CREATE EXTENSION IF NOT EXISTS timescaledb')
    
    // Create price_history table
    await pool.query(`
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
      )
    `)
    
    // Convert to hypertable (TimescaleDB optimization)
    // Check if hypertable already exists first
    const hypertableCheck = await pool.query(`
      SELECT * FROM timescaledb_information.hypertables 
      WHERE hypertable_name = 'price_history'
    `)
    
    if (hypertableCheck.rows.length === 0) {
      await pool.query(`SELECT create_hypertable('price_history', 'time', if_not_exists => TRUE)`)
      console.log('[PriceRecorder] Created price_history hypertable')
    }
    
    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_price_history_market_time 
      ON price_history (market_id, time DESC)
    `)
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_price_history_token_time 
      ON price_history (token_id, time DESC)
    `)
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_price_history_time 
      ON price_history (time DESC)
    `)
    
    migrationRun = true
    console.log('[PriceRecorder] ✅ Database migrations completed successfully')
  } catch (error: any) {
    console.error('[PriceRecorder] Migration error:', error.message)
    // Don't throw - allow service to continue even if migration fails
    // It might fail if tables already exist, which is fine
  }
}

/**
 * Initialize database connection pool
 */
export const initializePriceRecorder = async (): Promise<void> => {
  if (isInitialized) return

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.warn('[PriceRecorder] DATABASE_URL not set, price recording disabled')
    return
  }

  try {
    pool = new Pool({
      connectionString: databaseUrl,
      // Connection pool settings for high-throughput writes
      max: 5, // Max connections in pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })

    pool.on('error', (err) => {
      console.error('[PriceRecorder] Unexpected database error:', err)
    })

    isInitialized = true
    console.log('[PriceRecorder] Initialized database connection pool')
    
    // Run migrations automatically
    await runMigrations(pool)
  } catch (error) {
    console.error('[PriceRecorder] Failed to initialize database:', error)
    pool = null
  }
}

/**
 * Record price data to database (non-blocking)
 * This function fires and forgets - errors are logged but don't affect the caller
 */
export const recordPrice = async (
  marketId: string,
  tokenId: string,
  bestBid: number,
  bestAsk: number
): Promise<void> => {
  // Silently return if not initialized or pool is null
  if (!isInitialized || !pool) {
    return
  }

  // Fire and forget - don't await, don't block
  setImmediate(async () => {
    try {
      // Convert price to cents if needed (if price > 1, it's already in cents)
      let bidPrice = bestBid
      let askPrice = bestAsk
      
      if (bidPrice <= 1) {
        bidPrice = bidPrice * 100
      }
      if (askPrice <= 1) {
        askPrice = askPrice * 100
      }

      // Use best bid as the price (what the chart uses)
      const price = bidPrice

      // We need to determine if this is UP or DOWN token
      // For now, we'll store in best_bid/best_ask and let the API query determine UP/DOWN
      // by matching tokenId to yesTokenId/noTokenId from market metadata
      await pool!.query(
        `INSERT INTO price_history (time, market_id, token_id, best_bid, best_ask)
         VALUES (NOW(), $1, $2, $3, $4)
         ON CONFLICT (time, market_id, token_id) 
         DO UPDATE SET best_bid = $3, best_ask = $4`,
        [marketId, tokenId, price, askPrice]
      )
    } catch (error) {
      // Log error but don't throw - this is fire-and-forget
      // Only log first few errors to avoid spam
      const errorCount = (recordPrice as any).errorCount || 0
      if (errorCount < 5) {
        console.error(`[PriceRecorder] Error recording price for ${marketId}/${tokenId.substring(0, 20)}...:`, error)
        ;(recordPrice as any).errorCount = errorCount + 1
      }
    }
  })
}

/**
 * Record both UP and DOWN prices for a market
 * This is a convenience function that records both tokens at once
 */
export const recordMarketPrices = async (
  marketId: string,
  upTokenId: string | undefined,
  downTokenId: string | undefined,
  upBid: number | null,
  upAsk: number | null,
  downBid: number | null,
  downAsk: number | null
): Promise<void> => {
  // Record UP token price if available
  if (upTokenId && upBid !== null && upAsk !== null) {
    recordPrice(marketId, upTokenId, upBid, upAsk)
  }

  // Record DOWN token price if available
  if (downTokenId && downBid !== null && downAsk !== null) {
    recordPrice(marketId, downTokenId, downBid, downAsk)
  }
}

/**
 * Close database connection pool (for graceful shutdown)
 */
export const closePriceRecorder = async (): Promise<void> => {
  if (pool) {
    await pool.end()
    pool = null
    isInitialized = false
    console.log('[PriceRecorder] Closed database connection pool')
  }
}

