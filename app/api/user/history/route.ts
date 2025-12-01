'use server'

import { NextResponse } from 'next/server'

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
    // Fetch trade history from Polymarket CLOB API
    const response = await fetch(
      `${POLYMARKET_CLOB_API}/trades?user=${walletAddress}&limit=${limit}&offset=${offset}`,
      { 
        headers: { 'Accept': 'application/json' },
        cache: 'no-store' 
      }
    )

    if (response.ok) {
      const data = await response.json()
      const trades = Array.isArray(data) ? data : (data.trades || [])
      return NextResponse.json({
        trades,
        count: trades.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
        lastUpdated: new Date().toISOString(),
      })
    } else {
      console.error('Polymarket trades API error:', response.status)
    }
  } catch (error: any) {
    console.error('Trades fetch error:', error)
  }

  // Return empty if fetch fails
  return NextResponse.json({
    trades: [],
    count: 0,
    limit: parseInt(limit),
    offset: parseInt(offset),
    lastUpdated: new Date().toISOString(),
  })
}

