'use server'

import { NextResponse } from 'next/server'
import { makeAuthenticatedRequest } from '@/lib/polymarket-api-auth'
import { PolymarketApiCredentials } from '@/lib/polymarket-api-auth'

/**
 * POST /api/trade/cancel-order
 * Cancels an open order on Polymarket
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { orderId, walletAddress, credentials } = body

    if (!orderId) {
      return NextResponse.json({ error: 'Missing order ID' }, { status: 400 })
    }

    if (!walletAddress) {
      return NextResponse.json({ error: 'Missing wallet address' }, { status: 400 })
    }

    if (!credentials) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 })
    }

    const apiCredentials: PolymarketApiCredentials = credentials

    console.log('[Cancel Order] Canceling order:', orderId)
    console.log('[Cancel Order] Wallet:', walletAddress.slice(0, 10) + '...')

    // Cancel order via DELETE /order/{orderId}
    const response = await makeAuthenticatedRequest(
      'DELETE',
      `/order/${orderId}`,
      walletAddress,
      apiCredentials
    )

    console.log('[Cancel Order] Response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Cancel Order] Error:', response.status, errorText)
      
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { error: errorText }
      }

      return NextResponse.json({
        success: false,
        error: errorData.error || errorData.errorMsg || `Failed to cancel order: ${response.status}`,
        details: errorData,
      }, { status: response.status })
    }

    const data = await response.json()
    console.log('[Cancel Order] Success:', data)

    return NextResponse.json({
      success: true,
      message: 'Order cancelled successfully',
      data,
    })
  } catch (error: any) {
    console.error('[Cancel Order] Exception:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to cancel order',
    }, { status: 500 })
  }
}
