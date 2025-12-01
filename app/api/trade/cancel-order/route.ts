'use server'

import { NextResponse } from 'next/server'
import { makeAuthenticatedRequest } from '@/lib/polymarket-api-auth'
import { PolymarketApiCredentials } from '@/lib/polymarket-api-auth'

/**
 * DELETE /api/trade/cancel-order
 * Cancel an open order on Polymarket using L2 API credentials
 */
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const orderId = searchParams.get('orderId')
    const walletAddress = searchParams.get('walletAddress')
    const credentialsParam = searchParams.get('credentials')

    // Validate required fields
    if (!orderId) {
      return NextResponse.json(
        { error: 'Missing required parameter: orderId' },
        { status: 400 }
      )
    }

    if (!walletAddress || !credentialsParam) {
      return NextResponse.json(
        { error: 'Missing required parameters: walletAddress, credentials' },
        { status: 400 }
      )
    }

    // Parse credentials from query param
    const credentials = JSON.parse(credentialsParam)

    // Validate credentials structure
    const apiCredentials: PolymarketApiCredentials = {
      apiKey: credentials.apiKey,
      secret: credentials.secret,
      passphrase: credentials.passphrase,
    }

    // Make authenticated request to Polymarket
    const response = await makeAuthenticatedRequest(
      'DELETE',
      `/orders/${orderId}`,
      walletAddress,
      apiCredentials
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Polymarket cancel order error:', response.status, errorText)
      return NextResponse.json(
        { error: `Failed to cancel order: ${response.status}`, details: errorText },
        { status: response.status }
      )
    }

    const cancelData = await response.json()
    return NextResponse.json({
      success: true,
      message: 'Order cancelled successfully',
      data: cancelData,
    })
  } catch (error: any) {
    console.error('Cancel order error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to cancel order' },
      { status: 500 }
    )
  }
}

