'use server'

import { NextResponse } from 'next/server'

// Base URL for Polymarket Gamma API
const GAMMA_API_BASE = 'https://gamma-api.polymarket.com'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const marketId = searchParams.get('id')
  const slug = searchParams.get('slug')

  if (!marketId && !slug) {
    return NextResponse.json({ error: 'Missing id or slug parameter' }, { status: 400 })
  }

  try {
    let url = `${GAMMA_API_BASE}/markets?`
    if (marketId) {
      url += `id=${marketId}`
    } else if (slug) {
      url += `slug=${slug}`
    }

    const response = await fetch(url, {
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`Gamma API error: ${response.status}`)
    }

    const data = await response.json()
    // Return first market if array, or the market object directly
    const market = Array.isArray(data) ? data[0] : data?.data?.[0] || data

    return NextResponse.json(market)
  } catch (error: any) {
    console.error('Market details fetch error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch market details' }, { status: 500 })
  }
}

