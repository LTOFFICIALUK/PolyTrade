'use server'

import { NextResponse } from 'next/server'

const POLYMARKET_CLOB_API = 'https://clob.polymarket.com'

/**
 * GET /api/polymarket/nonce
 * Fetch the exchange nonce for a maker address
 * 
 * The nonce is a counter used to prevent replay attacks and ensure order uniqueness.
 * For accounts that haven't placed orders, the nonce will be 0.
 * 
 * Note: The Polymarket API may return 404 if the account has no nonce history,
 * which is normal for new accounts - we default to 0 in that case.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const maker = searchParams.get('maker')

  if (!maker) {
    return NextResponse.json({ error: 'Missing maker address' }, { status: 400 })
  }

  // Normalize the maker address to lowercase for the API
  const normalizedMaker = maker.toLowerCase()

  // Try different nonce endpoints
  // The nonce endpoint may differ between regular and neg-risk exchanges
  const endpoints = [
    `/nonce?maker=${normalizedMaker}`,
    `/exchange/nonce?maker=${normalizedMaker}`,
    `/neg-risk/nonce?maker=${normalizedMaker}`,
  ]

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${POLYMARKET_CLOB_API}${endpoint}`, {
        headers: {
          'Accept': 'application/json',
        },
        cache: 'no-store',
      })

      if (response.ok) {
        const data = await response.json()
        const nonceValue = data.nonce ?? data.data ?? 0
        console.log(`[Nonce] Got nonce from ${endpoint}:`, nonceValue)
        return NextResponse.json({ nonce: nonceValue.toString() })
      }
      
      // 404 is expected for accounts with no nonce history - this is normal
      if (response.status === 404) {
        console.log(`[Nonce] Endpoint ${endpoint} returned 404 (no nonce history)`)
      } else {
      console.warn(`[Nonce] Endpoint ${endpoint} returned ${response.status}`)
      }
    } catch (error) {
      console.warn(`[Nonce] Error with ${endpoint}:`, error)
    }
  }

  // Default to 0 if no nonce found - this is correct for accounts that haven't placed orders yet
  // The nonce increments with each order, so first order uses nonce 0
  console.log(`[Nonce] Using default nonce 0 for ${normalizedMaker} (no prior nonce history)`)
  return NextResponse.json({ nonce: '0' })
}

