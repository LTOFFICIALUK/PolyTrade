'use server'

import { NextResponse } from 'next/server'

// Base URL for Polymarket API
const POLYMARKET_API_BASE = 'https://api.polymarket.com'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const tokenId = searchParams.get('tokenId')
  const tokenIds = searchParams.get('tokenIds') // Comma-separated list

  try {
    // Single token price
    if (tokenId) {
      const response = await fetch(`${POLYMARKET_API_BASE}/pricing/market-price?token_id=${tokenId}`, {
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error(`Polymarket API error: ${response.status}`)
      }

      const data = await response.json()
      return NextResponse.json(data)
    }

    // Multiple token prices
    if (tokenIds) {
      const tokenArray = tokenIds.split(',').map((id) => id.trim())
      const response = await fetch(`${POLYMARKET_API_BASE}/pricing/multiple-market-prices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token_ids: tokenArray }),
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error(`Polymarket API error: ${response.status}`)
      }

      const data = await response.json()
      return NextResponse.json(data)
    }

    return NextResponse.json({ error: 'Missing tokenId or tokenIds parameter' }, { status: 400 })
  } catch (error: any) {
    console.error('Price fetch error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch prices' }, { status: 500 })
  }
}

