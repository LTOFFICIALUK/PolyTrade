'use server'

import { NextResponse } from 'next/server'
import { makeAuthenticatedRequest, PolymarketApiCredentials } from '@/lib/polymarket-api-auth'

/**
 * POST /api/polymarket/test-auth
 * Test if Polymarket API credentials are valid
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { walletAddress, credentials } = body

    if (!walletAddress || !credentials) {
      return NextResponse.json(
        { error: 'Missing walletAddress or credentials' },
        { status: 400 }
      )
    }

    console.log('[Test Auth] Testing credentials for:', walletAddress.substring(0, 10) + '...')
    console.log('[Test Auth] Credentials:', {
      apiKey: credentials.apiKey?.substring(0, 10) + '...',
      secretLength: credentials.secret?.length,
      passphraseLength: credentials.passphrase?.length,
    })

    const apiCredentials: PolymarketApiCredentials = {
      apiKey: credentials.apiKey,
      secret: credentials.secret,
      passphrase: credentials.passphrase,
    }

    // Try to get user's API keys (a simple authenticated endpoint)
    const response = await makeAuthenticatedRequest(
      'GET',
      '/auth/api-keys',
      walletAddress,
      apiCredentials
    )

    console.log('[Test Auth] Response status:', response.status)
    const responseText = await response.text()
    console.log('[Test Auth] Response body:', responseText)

    if (response.ok) {
      return NextResponse.json({
        success: true,
        message: 'Credentials are valid',
        data: JSON.parse(responseText),
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Credentials are invalid or expired',
        status: response.status,
        details: responseText,
      }, { status: response.status })
    }
  } catch (error: any) {
    console.error('[Test Auth] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

