'use server'

import { NextResponse } from 'next/server'
import { Pool } from 'pg'

// Database connection pool (reuse connections)
let pool: Pool | null = null

const getPool = (): Pool => {
  if (!pool) {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      throw new Error('DATABASE_URL not configured')
    }
    pool = new Pool({
      connectionString: databaseUrl,
      max: 2, // Small pool for API routes
    })
  }
  return pool
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const marketId = searchParams.get('marketId')
  const yesTokenId = searchParams.get('yesTokenId')
  const noTokenId = searchParams.get('noTokenId')
  const startTime = searchParams.get('startTime') // Unix timestamp in ms
  const endTime = searchParams.get('endTime') // Unix timestamp in ms

  // We need either marketId OR both tokenIds
  if (!marketId && (!yesTokenId || !noTokenId)) {
    return NextResponse.json(
      { error: 'Missing required parameters: marketId OR (yesTokenId and noTokenId)' },
      { status: 400 }
    )
  }

  try {
    const dbPool = getPool()

    // If we have marketId, we can query by marketId
    // If we only have tokenIds, we need to find the marketId first (or query by tokenId)
    let queryMarketId = marketId

    // If no marketId but we have tokenIds, try to find marketId from one of the tokens
    if (!queryMarketId && yesTokenId) {
      const marketResult = await dbPool.query(
        `SELECT DISTINCT market_id FROM price_history WHERE token_id = $1 LIMIT 1`,
        [yesTokenId]
      )
      if (marketResult.rows.length > 0) {
        queryMarketId = marketResult.rows[0].market_id
      }
    }

    if (!queryMarketId) {
      return NextResponse.json(
        { error: 'Could not determine marketId from provided parameters' },
        { status: 400 }
      )
    }

    // Build time range filter
    let timeFilter = ''
    const params: any[] = [queryMarketId]
    let paramIndex = 2

    if (startTime) {
      const startTimestamp = parseInt(startTime)
      if (!isNaN(startTimestamp)) {
        timeFilter += ` AND time >= $${paramIndex}`
        params.push(new Date(startTimestamp))
        paramIndex++
      }
    }

    if (endTime) {
      const endTimestamp = parseInt(endTime)
      if (!isNaN(endTimestamp)) {
        timeFilter += ` AND time <= $${paramIndex}`
        params.push(new Date(endTimestamp))
        paramIndex++
      }
    }

    // Query for UP token prices (yesTokenId or first token)
    const upTokenId = yesTokenId || null
    const downTokenId = noTokenId || null

    // If we have specific tokenIds, use them; otherwise query all tokens for this market
    let tokenFilter = ''
    if (upTokenId && downTokenId) {
      tokenFilter = ` AND token_id IN ($${paramIndex}, $${paramIndex + 1})`
      params.push(upTokenId, downTokenId)
    }

    // Query to get all price points for this market
    // Round to nearest second (time_bucket) for better grouping
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

    const result = await dbPool.query(query, params)

    // Group by time bucket and combine UP/DOWN prices
    const priceMap = new Map<number, { upPrice: number | null; downPrice: number | null }>()

    for (const row of result.rows) {
      const time = Math.round(row.time_ms)
      const tokenId = row.token_id
      const price = parseFloat(row.best_bid)

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

    return NextResponse.json({
      success: true,
      data: chartData,
      count: chartData.length,
    })
  } catch (error: any) {
    console.error('[price-history] Error fetching price history:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch price history' },
      { status: 500 }
    )
  }
}
