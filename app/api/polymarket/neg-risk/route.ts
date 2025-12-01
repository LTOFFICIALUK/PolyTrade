'use server'

import { NextResponse } from 'next/server'

const POLYMARKET_CLOB_API = 'https://clob.polymarket.com'

/**
 * GET /api/polymarket/neg-risk
 * Check if a token is a neg-risk market
 * This determines which exchange address to use for EIP-712 signing
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const tokenId = searchParams.get('tokenId')

  if (!tokenId) {
    return NextResponse.json({ error: 'Missing tokenId' }, { status: 400 })
  }

  try {
    const response = await fetch(
      `${POLYMARKET_CLOB_API}/neg-risk?token_id=${tokenId}`,
      {
        headers: {
          Accept: 'application/json',
        },
        cache: 'no-store',
      }
    )

    if (!response.ok) {
      console.error(`[Neg-Risk] API returned ${response.status} for tokenId ${tokenId}`)
      // Default to false if we can't determine
      return NextResponse.json({ negRisk: false })
    }

    const data = await response.json()
    console.log(`[Neg-Risk] Token ${tokenId.substring(0, 20)}... is neg_risk: ${data.neg_risk}`)
    
    return NextResponse.json({ negRisk: data.neg_risk === true })
  } catch (error: any) {
    console.error(`[Neg-Risk] Error checking neg-risk for ${tokenId}:`, error)
    // Default to false if there's an error
    return NextResponse.json({ negRisk: false })
  }
}

