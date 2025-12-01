'use server'

import { NextResponse } from 'next/server'

const POLYMARKET_DATA_API = 'https://data-api.polymarket.com'
const POLYMARKET_CLOB_API = 'https://clob.polymarket.com'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const walletAddress = searchParams.get('address')
  const limit = searchParams.get('limit') || '100'
  const offset = searchParams.get('offset') || '0'

  if (!walletAddress) {
    return NextResponse.json({ error: 'Missing wallet address parameter' }, { status: 400 })
  }

  try {
    // Try Data API first for richer trade data with market titles
    const dataApiResponse = await fetch(
      `${POLYMARKET_DATA_API}/trades?user=${walletAddress}&limit=${limit}&offset=${offset}`,
      { 
        headers: { 'Accept': 'application/json' },
        cache: 'no-store' 
      }
    )

    if (dataApiResponse.ok) {
      const data = await dataApiResponse.json()
      const trades = Array.isArray(data) ? data : (data.trades || [])
      return NextResponse.json({
        trades,
        count: trades.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
        lastUpdated: new Date().toISOString(),
        source: 'data-api',
      })
    }
  } catch (error: any) {
    console.error('Data API trades fetch error:', error)
  }

  // Fallback to CLOB API
  try {
    const clobResponse = await fetch(
      `${POLYMARKET_CLOB_API}/trades?user=${walletAddress}&limit=${limit}&offset=${offset}`,
      { 
        headers: { 'Accept': 'application/json' },
        cache: 'no-store' 
      }
    )

    if (clobResponse.ok) {
      const data = await clobResponse.json()
      const trades = Array.isArray(data) ? data : (data.trades || [])
      return NextResponse.json({
        trades,
        count: trades.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
        lastUpdated: new Date().toISOString(),
        source: 'clob-api',
      })
    } else {
      console.error('CLOB API trades error:', clobResponse.status)
    }
  } catch (error: any) {
    console.error('CLOB API trades fetch error:', error)
  }

  // Return empty if both APIs fail
  return NextResponse.json({
    trades: [],
    count: 0,
    limit: parseInt(limit),
    offset: parseInt(offset),
    lastUpdated: new Date().toISOString(),
    source: 'none',
  })
}

