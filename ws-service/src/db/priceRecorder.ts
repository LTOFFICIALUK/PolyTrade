/**
 * Price recorder for TimescaleDB
 * Records price history without blocking real-time updates
 */

import { Pool } from 'pg'

let pool: Pool | null = null
let isInitialized = false

/**
 * Initialize database connection pool
 */
export const initializePriceRecorder = (): void => {
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

