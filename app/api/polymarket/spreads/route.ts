'use server'

import { NextResponse } from 'next/server'

// Base URL for Polymarket API
const POLYMARKET_API_BASE = 'https://api.polymarket.com'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const tokenId = searchParams.get('tokenId')
  const tokenIds = searchParams.get('tokenIds') // Comma-separated list

  try {
    let url = `${POLYMARKET_API_BASE}/spreads/bid-ask-spreads`
    
    if (tokenId) {
      url += `?token_id=${tokenId}`
    } else if (tokenIds) {
      const tokenArray = tokenIds.split(',').map((id) => id.trim())
      const response = await fetch(url, {
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
    } else {
      return NextResponse.json({ error: 'Missing tokenId or tokenIds parameter' }, { status: 400 })
    }

    const response = await fetch(url, {
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`Polymarket API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Spreads fetch error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch spreads' }, { status: 500 })
  }
}

