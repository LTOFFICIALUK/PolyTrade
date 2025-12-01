'use server'

import { NextResponse } from 'next/server'

const POLYMARKET_DATA_API = 'https://data-api.polymarket.com'

export interface Trade {
  id: string
  taker_order_id: string
  market: string
  asset_id: string
  side: 'BUY' | 'SELL'
  size: string
  fee_rate_bps: string
  price: string
  status: string
  match_time: string
  last_update: string
  outcome: string
  title: string
  slug: string
  icon: string
  owner: string
  maker_address: string
  transaction_hash: string
  bucket_index: number
  type: string
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const walletAddress = searchParams.get('address')
  const market = searchParams.get('market')
  const limit = searchParams.get('limit') || '100'
  const offset = searchParams.get('offset') || '0'

  if (!walletAddress) {
    return NextResponse.json({ error: 'Missing wallet address parameter' }, { status: 400 })
  }

  try {
    // Build query params
    const params = new URLSearchParams({
      user: walletAddress,
      limit,
      offset,
    })

    if (market) {
      params.append('market', market)
    }

    // Fetch trades from Polymarket Data API
    const response = await fetch(
      `${POLYMARKET_DATA_API}/trades?${params.toString()}`,
      {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store',
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
      console.error('Polymarket trades API error:', response.status, await response.text())
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

