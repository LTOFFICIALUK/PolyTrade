'use server'

import { NextResponse } from 'next/server'

/**
 * API route for getting redeemable positions
 * The actual redemption happens client-side via the user's wallet
 */

const POLYMARKET_DATA_API = 'https://data-api.polymarket.com'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const walletAddress = searchParams.get('address')

  if (!walletAddress) {
    return NextResponse.json({ error: 'Missing wallet address' }, { status: 400 })
  }

  try {
    // Fetch positions from Polymarket
    const response = await fetch(
      `${POLYMARKET_DATA_API}/positions?user=${walletAddress}&sizeThreshold=0`,
      {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store',
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch positions: ${response.status}`)
    }

    const positions = await response.json()
    
    // Filter to only redeemable positions
    const redeemable = (Array.isArray(positions) ? positions : [])
      .filter((p: any) => p.redeemable === true)
      .map((p: any) => ({
        conditionId: p.conditionId,
        outcomeIndex: p.outcomeIndex,
        outcome: p.outcome,
        size: p.size,
        currentValue: p.currentValue,
        title: p.title,
        asset: p.asset,
        icon: p.icon,
      }))

    return NextResponse.json({
      redeemable,
      count: redeemable.length,
      totalValue: redeemable.reduce((sum: number, p: any) => sum + (p.currentValue || 0), 0),
    })
  } catch (error: any) {
    console.error('[Redeem API] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

