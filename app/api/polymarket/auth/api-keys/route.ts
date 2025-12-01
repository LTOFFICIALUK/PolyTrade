'use server'

import { NextResponse } from 'next/server'

const POLYMARKET_CLOB_API = 'https://clob.polymarket.com'

/**
 * GET /api/polymarket/auth/api-keys
 * List all API keys for a user (requires L1 authentication)
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const address = searchParams.get('address')
    const signature = searchParams.get('signature')
    const timestamp = searchParams.get('timestamp')
    const nonce = searchParams.get('nonce') || '0'

    if (!address || !signature || !timestamp) {
      return NextResponse.json(
        { error: 'Missing required query params: address, signature, timestamp' },
        { status: 400 }
      )
    }

    const response = await fetch(`${POLYMARKET_CLOB_API}/auth/api-keys`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'POLY_ADDRESS': address,
        'POLY_SIGNATURE': signature,
        'POLY_TIMESTAMP': timestamp,
        'POLY_NONCE': nonce,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Polymarket API error:', response.status, errorText)
      return NextResponse.json(
        { error: `Polymarket API error: ${response.status}`, details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('List API keys error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to list API keys' },
      { status: 500 }
    )
  }
}

