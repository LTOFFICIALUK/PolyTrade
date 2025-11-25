'use server'

import { NextResponse } from 'next/server'

// Base URL for Polymarket API
const POLYMARKET_API_BASE = 'https://api.polymarket.com'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const tokenId = searchParams.get('tokenId')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  if (!tokenId) {
    return NextResponse.json({ error: 'Missing tokenId parameter' }, { status: 400 })
  }

  try {
    let url = `${POLYMARKET_API_BASE}/pricing/price-history?token_id=${tokenId}`
    if (startDate) url += `&start_date=${startDate}`
    if (endDate) url += `&end_date=${endDate}`

    const response = await fetch(url, {
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`Polymarket API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Price history fetch error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch price history' }, { status: 500 })
  }
}

