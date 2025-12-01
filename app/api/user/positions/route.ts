'use server'

import { NextResponse } from 'next/server'

const POLYMARKET_CLOB_API = 'https://clob.polymarket.com'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const walletAddress = searchParams.get('address')

  if (!walletAddress) {
    return NextResponse.json({ error: 'Missing wallet address parameter' }, { status: 400 })
  }

  try {
    // Fetch current positions from Polymarket CLOB API
    const response = await fetch(
      `${POLYMARKET_CLOB_API}/positions?user=${walletAddress}`,
      { 
        headers: { 'Accept': 'application/json' },
        cache: 'no-store' 
      }
    )

    if (response.ok) {
      const data = await response.json()
      const positions = Array.isArray(data) ? data : (data.positions || [])
      return NextResponse.json({ 
        positions, 
        count: positions.length,
        lastUpdated: new Date().toISOString(),
      })
    } else {
      console.error('Polymarket positions API error:', response.status)
    }
  } catch (error: any) {
    console.error('Positions fetch error:', error)
  }

  // Return empty if fetch fails
  return NextResponse.json({ 
    positions: [], 
    count: 0,
    lastUpdated: new Date().toISOString(),
  })
}

