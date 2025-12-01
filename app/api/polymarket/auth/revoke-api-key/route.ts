'use server'

import { NextResponse } from 'next/server'

const POLYMARKET_CLOB_API = 'https://clob.polymarket.com'

/**
 * DELETE /api/polymarket/auth/revoke-api-key
 * Revoke/delete an API key (requires L1 authentication)
 */
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const address = searchParams.get('address')
    const signature = searchParams.get('signature')
    const timestamp = searchParams.get('timestamp')
    const nonce = searchParams.get('nonce') || '0'
    const apiKey = searchParams.get('apiKey')

    if (!address || !signature || !timestamp) {
      return NextResponse.json(
        { error: 'Missing required query params: address, signature, timestamp' },
        { status: 400 }
      )
    }

    const url = apiKey
      ? `${POLYMARKET_CLOB_API}/auth/api-key?apiKey=${encodeURIComponent(apiKey)}`
      : `${POLYMARKET_CLOB_API}/auth/api-key`

    const response = await fetch(url, {
      method: 'DELETE',
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

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Revoke API key error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to revoke API key' },
      { status: 500 }
    )
  }
}

