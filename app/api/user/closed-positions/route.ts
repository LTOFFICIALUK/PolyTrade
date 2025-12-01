'use server'

import { NextResponse } from 'next/server'

const POLYMARKET_DATA_API = 'https://data-api.polymarket.com'

export interface ClosedPosition {
  proxyWallet: string
  asset: string
  conditionId: string
  avgPrice: number
  totalBought: number
  realizedPnl: number
  curPrice: number
  timestamp: number
  title: string
  slug: string
  icon: string
  eventSlug: string
  outcome: string
  outcomeIndex: number
  oppositeOutcome: string
  oppositeAsset: string
  endDate: string
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const walletAddress = searchParams.get('address')
  const limit = searchParams.get('limit') || '50'
  const offset = searchParams.get('offset') || '0'
  const sortBy = searchParams.get('sortBy') || 'TIMESTAMP'
  const sortDirection = searchParams.get('sortDirection') || 'DESC'

  if (!walletAddress) {
    return NextResponse.json({ error: 'Missing wallet address parameter' }, { status: 400 })
  }

  try {
    // Fetch closed positions from Polymarket Data API
    const params = new URLSearchParams({
      user: walletAddress,
      limit,
      offset,
      sortBy,
      sortDirection,
    })

    const response = await fetch(
      `${POLYMARKET_DATA_API}/closed-positions?${params.toString()}`,
      {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store',
      }
    )

    if (response.ok) {
      const data = await response.json()
      const positions = Array.isArray(data) ? data : (data.positions || [])

      return NextResponse.json({
        positions,
        count: positions.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
        lastUpdated: new Date().toISOString(),
      })
    } else {
      console.error('Polymarket closed positions API error:', response.status, await response.text())
    }
  } catch (error: any) {
    console.error('Closed positions fetch error:', error)
  }

  // Return empty if fetch fails
  return NextResponse.json({
    positions: [],
    count: 0,
    limit: parseInt(limit),
    offset: parseInt(offset),
    lastUpdated: new Date().toISOString(),
  })
}

