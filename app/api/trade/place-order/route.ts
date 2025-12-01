'use server'

import { NextResponse } from 'next/server'
import { makeAuthenticatedRequest } from '@/lib/polymarket-api-auth'
import { PolymarketApiCredentials } from '@/lib/polymarket-api-auth'

/**
 * POST /api/trade/place-order
 * Place a buy or sell order on Polymarket using L2 API credentials
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      walletAddress,
      credentials,
      tokenId,
      side, // 'BUY' or 'SELL'
      price, // Price in cents (e.g., 50 for $0.50)
      size, // Size in shares
      orderType = 'LIMIT', // 'LIMIT' or 'MARKET'
    } = body

    // Validate required fields
    if (!walletAddress || !credentials || !tokenId || !side || !size) {
      return NextResponse.json(
        { error: 'Missing required fields: walletAddress, credentials, tokenId, side, size' },
        { status: 400 }
      )
    }

    if (orderType === 'LIMIT' && !price) {
      return NextResponse.json(
        { error: 'Price is required for LIMIT orders' },
        { status: 400 }
      )
    }

    // Validate credentials structure
    const apiCredentials: PolymarketApiCredentials = {
      apiKey: credentials.apiKey,
      secret: credentials.secret,
      passphrase: credentials.passphrase,
    }

    // Convert price from cents to decimal (e.g., 50 -> 0.50)
    const priceDecimal = price ? (price / 100).toFixed(2) : undefined

    // Build order payload for Polymarket CLOB API
    const orderPayload: any = {
      token_id: tokenId,
      side: side.toUpperCase(),
      size: size.toString(),
      price: priceDecimal,
    }

    // For MARKET orders, omit price or set to null
    if (orderType === 'MARKET') {
      delete orderPayload.price
    }

    // Make authenticated request to Polymarket
    const response = await makeAuthenticatedRequest(
      'POST',
      '/orders',
      walletAddress,
      apiCredentials,
      orderPayload
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Polymarket place order error:', response.status, errorText)
      return NextResponse.json(
        { error: `Failed to place order: ${response.status}`, details: errorText },
        { status: response.status }
      )
    }

    const orderData = await response.json()
    return NextResponse.json({
      success: true,
      order: orderData,
    })
  } catch (error: any) {
    console.error('Place order error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to place order' },
      { status: 500 }
    )
  }
}

