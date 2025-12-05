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
    
    // Enable compression to reduce storage by 90%+
    try {
      await pool.query(`
        ALTER TABLE price_history SET (
          timescaledb.compress,
          timescaledb.compress_segmentby = 'market_id, token_id'
        )
      `)
      
      // Add compression policy: compress chunks older than 15 minutes (aggressive for Railway)
      await pool.query(`
        SELECT add_compression_policy('price_history', INTERVAL '15 minutes', if_not_exists => TRUE)
      `)
      console.log('[PriceRecorder] Enabled compression policy (15 min)')
    } catch (compressionError: any) {
      // Compression might already be enabled, that's fine
      console.log('[PriceRecorder] Compression setup:', compressionError.message)
    }
    
    // Add retention policy: Delete data older than 2 days to prevent disk space issues
    // Railway free tier has very limited storage - keep only 2 days for aggressive compression
    try {
      await pool.query(`
        SELECT add_retention_policy('price_history', INTERVAL '2 days', if_not_exists => TRUE)
      `)
      console.log('[PriceRecorder] Enabled retention policy (2 days)')
    } catch (retentionError: any) {
      // Retention might already be enabled, that's fine
      console.log('[PriceRecorder] Retention policy setup:', retentionError.message)
    }
    
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

      // Debug: Log recorded prices (only every 10th record to avoid spam)
      const recordCount = ((recordPrice as any).recordCount || 0) + 1
      ;(recordPrice as any).recordCount = recordCount
      if (recordCount % 10 === 0) {
        console.log(`[PriceRecorder] Recording: marketId=${marketId.substring(0,20)}..., tokenId=${tokenId.substring(0,12)}..., bid=${price.toFixed(1)}c, ask=${askPrice.toFixed(1)}c`)
      }

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
 * Query price history from database
 */
export const queryPriceHistory = async (
  marketId: string | null,
  yesTokenId: string | null,
  noTokenId: string | null,
  startTime: Date | null,
  endTime: Date | null
): Promise<any[]> => {
  if (!isInitialized || !pool) {
    throw new Error('Database not initialized')
  }

  try {
    // If we have marketId, we can query by marketId
    // If we only have tokenIds, we need to find the marketId first
    let queryMarketId = marketId

    // If no marketId but we have tokenIds, try to find marketId from one of the tokens
    if (!queryMarketId && yesTokenId) {
      const marketResult = await pool.query(
        `SELECT DISTINCT market_id FROM price_history WHERE token_id = $1 LIMIT 1`,
        [yesTokenId]
      )
      if (marketResult.rows.length > 0) {
        queryMarketId = marketResult.rows[0].market_id
      }
    }

    if (!queryMarketId) {
      return []
    }

    // Build time range filter
    let timeFilter = ''
    const params: any[] = [queryMarketId]
    let paramIndex = 2

    if (startTime) {
      timeFilter += ` AND time >= $${paramIndex}`
      params.push(startTime)
      paramIndex++
    }

    if (endTime) {
      timeFilter += ` AND time <= $${paramIndex}`
      params.push(endTime)
      paramIndex++
    }

    // Query for UP token prices (yesTokenId or first token)
    const upTokenId = yesTokenId || null
    const downTokenId = noTokenId || null

    // If we have specific tokenIds, use them
    let tokenFilter = ''
    if (upTokenId && downTokenId) {
      tokenFilter = ` AND token_id IN ($${paramIndex}, $${paramIndex + 1})`
      params.push(upTokenId, downTokenId)
    }

    // Query to get all price points for this market
    const query = `
      SELECT 
        EXTRACT(EPOCH FROM time_bucket('1 second', time)) * 1000 as time_ms,
        token_id,
        AVG(best_bid) as best_bid
      FROM price_history
      WHERE market_id = $1
        ${timeFilter}
        ${tokenFilter}
      GROUP BY time_bucket('1 second', time), token_id
      ORDER BY time_ms ASC
    `

    const result = await pool.query(query, params)

    // Group by time bucket and combine UP/DOWN prices
    const priceMap = new Map<number, { upPrice: number | null; downPrice: number | null }>()

    for (const row of result.rows) {
      const time = Math.round(row.time_ms)
      const tokenId = row.token_id
      const price = parseFloat(row.best_bid) / 100 // Convert from cents to dollars

      if (!priceMap.has(time)) {
        priceMap.set(time, { upPrice: null, downPrice: null })
      }

      const point = priceMap.get(time)!
      
      // Determine if this is UP or DOWN token
      if (upTokenId && tokenId === upTokenId) {
        point.upPrice = price
      } else if (downTokenId && tokenId === downTokenId) {
        point.downPrice = price
      } else if (!upTokenId && !downTokenId) {
        // No specific tokenIds - use first seen as UP, second as DOWN
        if (point.upPrice === null) {
          point.upPrice = price
        } else if (point.downPrice === null) {
          point.downPrice = price
        }
      }
    }

    // Convert map to sorted array
    const sortedTimes = Array.from(priceMap.keys()).sort((a, b) => a - b)
    
    // Forward-fill missing prices (carry previous value forward)
    let lastUpPrice = 0
    let lastDownPrice = 0
    
    const chartData: Array<{ time: number; upPrice: number; downPrice: number }> = []
    
    for (const time of sortedTimes) {
      const point = priceMap.get(time)!
      
      // Use current price or carry forward the last known price
      const upPrice = point.upPrice !== null ? point.upPrice : lastUpPrice
      const downPrice = point.downPrice !== null ? point.downPrice : lastDownPrice
      
      // Update last known prices
      if (point.upPrice !== null) lastUpPrice = point.upPrice
      if (point.downPrice !== null) lastDownPrice = point.downPrice
      
      // Only add points where we have at least one valid price
      if (upPrice > 0 || downPrice > 0) {
        chartData.push({ time, upPrice, downPrice })
      }
    }

    return chartData
  } catch (error: any) {
    console.error('[PriceRecorder] Error querying price history:', error)
    throw error
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

