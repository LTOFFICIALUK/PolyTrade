'use server'

import { NextResponse } from 'next/server'

const POLYMARKET_DATA_API = 'https://data-api.polymarket.com'
const POLYMARKET_CLOB_API = 'https://clob.polymarket.com'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const walletAddress = searchParams.get('address')
  const sizeThreshold = searchParams.get('sizeThreshold') || '0'
  const limit = searchParams.get('limit') || '100'

  if (!walletAddress) {
    return NextResponse.json({ error: 'Missing wallet address parameter' }, { status: 400 })
  }

  try {
    // Try Data API first for richer position data with market titles, PnL, etc.
    const params = new URLSearchParams({
      user: walletAddress,
      sizeThreshold,
      limit,
    })

    const dataApiResponse = await fetch(
      `${POLYMARKET_DATA_API}/positions?${params.toString()}`,
      { 
        headers: { 'Accept': 'application/json' },
        cache: 'no-store' 
      }
    )

    if (dataApiResponse.ok) {
      const data = await dataApiResponse.json()
      const positions = Array.isArray(data) ? data : (data.positions || [])
      return NextResponse.json({ 
        positions, 
        count: positions.length,
        lastUpdated: new Date().toISOString(),
        source: 'data-api',
      })
    }
  } catch (error: any) {
    console.error('Data API positions fetch error:', error)
  }

  // Fallback to CLOB API
  try {
    const clobResponse = await fetch(
      `${POLYMARKET_CLOB_API}/positions?user=${walletAddress}`,
      { 
        headers: { 'Accept': 'application/json' },
        cache: 'no-store' 
      }
    )

    if (clobResponse.ok) {
      const data = await clobResponse.json()
      const positions = Array.isArray(data) ? data : (data.positions || [])
      return NextResponse.json({ 
        positions, 
        count: positions.length,
        lastUpdated: new Date().toISOString(),
        source: 'clob-api',
      })
    } else {
      console.error('CLOB API positions error:', clobResponse.status)
    }
  } catch (error: any) {
    console.error('CLOB API positions fetch error:', error)
  }

  // Return empty if both APIs fail
  return NextResponse.json({ 
    positions: [], 
    count: 0,
    lastUpdated: new Date().toISOString(),
    source: 'none',
  })
}

