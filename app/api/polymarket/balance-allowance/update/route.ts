'use server'

import { NextResponse } from 'next/server'
import { makeAuthenticatedRequest, PolymarketApiCredentials } from '@/lib/polymarket-api-auth'

/**
 * POST /api/polymarket/balance-allowance/update
 * 
 * Syncs on-chain USDC approval with Polymarket's internal balance/allowance system.
 * This must be called after approving USDC on-chain to enable trading.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { walletAddress, credentials, assetType = 'COLLATERAL' } = body

    if (!walletAddress || !credentials) {
      return NextResponse.json(
        { error: 'Missing walletAddress or credentials' },
        { status: 400 }
      )
    }

    const apiCredentials: PolymarketApiCredentials = {
      apiKey: credentials.apiKey,
      secret: credentials.secret,
      passphrase: credentials.passphrase,
    }

    console.log('[Balance Allowance] Updating for:', walletAddress)
    console.log('[Balance Allowance] Asset type:', assetType)

    // Call Polymarket's update-balance-allowance endpoint
    // This syncs the on-chain approval with their internal system
    const response = await makeAuthenticatedRequest(
      'GET', // The SDK uses GET for this endpoint
      `/balance-allowance/update?asset_type=${assetType}&signature_type=0`,
      walletAddress,
      apiCredentials
    )

    console.log('[Balance Allowance] Response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { error: errorText }
      }
      
      console.error('[Balance Allowance] Error:', errorData)
      
      return NextResponse.json(
        { 
          success: false, 
          error: errorData.error || 'Failed to update balance allowance',
          details: errorData,
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('[Balance Allowance] Success:', data)

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error: any) {
    console.error('[Balance Allowance] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/polymarket/balance-allowance/update
 * 
 * Get current balance and allowance status from Polymarket
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const walletAddress = searchParams.get('address')
    const assetType = searchParams.get('asset_type') || 'COLLATERAL'
    
    // For GET, we need credentials from headers or query
    const apiKey = searchParams.get('apiKey')
    const secret = searchParams.get('secret')
    const passphrase = searchParams.get('passphrase')

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Missing address parameter' },
        { status: 400 }
      )
    }

    if (!apiKey || !secret || !passphrase) {
      return NextResponse.json(
        { error: 'Missing API credentials' },
        { status: 400 }
      )
    }

    const apiCredentials: PolymarketApiCredentials = {
      apiKey,
      secret,
      passphrase,
    }

    // Call Polymarket's get-balance-allowance endpoint
    const response = await makeAuthenticatedRequest(
      'GET',
      `/balance-allowance?asset_type=${assetType}&signature_type=0`,
      walletAddress,
      apiCredentials
    )

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { error: 'Failed to get balance allowance', details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('[Balance Allowance] GET Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

