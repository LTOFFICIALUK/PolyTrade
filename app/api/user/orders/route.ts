'use server'

import { NextResponse } from 'next/server'
import { getUserOrders } from '@/lib/websocket-server'
import { makeAuthenticatedRequest } from '@/lib/polymarket-api-auth'
import { PolymarketApiCredentials } from '@/lib/polymarket-api-auth'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const walletAddress = searchParams.get('address')
  const credentialsParam = searchParams.get('credentials') // JSON string of credentials

  if (!walletAddress) {
    return NextResponse.json({ error: 'Missing wallet address parameter' }, { status: 400 })
  }

  // If credentials are provided, use Polymarket API directly
  if (credentialsParam) {
    console.log('[Orders API] Credentials param received, length:', credentialsParam.length)
    
    try {
      const credentials: PolymarketApiCredentials = JSON.parse(credentialsParam)
      
      console.log('[Orders API] Fetching orders for:', walletAddress.slice(0, 10) + '...')
      console.log('[Orders API] Credentials parsed:', { 
        hasApiKey: !!credentials.apiKey, 
        apiKeyLength: credentials.apiKey?.length,
        hasSecret: !!credentials.secret,
        secretLength: credentials.secret?.length,
        hasPassphrase: !!credentials.passphrase,
        passphraseLength: credentials.passphrase?.length,
      })
      
      // Fetch LIVE orders from Polymarket CLOB API
      // GET /data/orders with L2 authentication
      const response = await makeAuthenticatedRequest(
        'GET',
        '/data/orders', // Don't include query params in path for HMAC signature
        walletAddress,
        credentials
      )

      console.log('[Orders API] Response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('[Orders API] Raw response:', JSON.stringify(data).slice(0, 500))
        
        // Polymarket returns array of orders directly
        const orders = Array.isArray(data) ? data : (data.orders || data.data || [])
        console.log('[Orders API] Parsed orders count:', orders.length)
        
        return NextResponse.json({ orders, count: orders.length, source: 'polymarket-api' })
      } else {
        const errorText = await response.text()
        console.error('[Orders API] Error response:', response.status, errorText)
        // Return the error info instead of falling through
        return NextResponse.json({ 
          orders: [], 
          count: 0, 
          source: 'polymarket-api-error',
          error: `Polymarket API returned ${response.status}`,
          errorDetails: errorText.slice(0, 200)
        })
      }
    } catch (error: any) {
      console.error('[Orders API] Polymarket API orders fetch error:', error.message)
      // Return error info instead of silent fallback
      return NextResponse.json({ 
        orders: [], 
        count: 0, 
        source: 'polymarket-api-exception',
        error: error.message
      })
    }
  } else {
    console.log('[Orders API] No credentials provided, using fallback')
  }

  // Fallback to WebSocket server (only if no credentials)
  try {
    console.log('[Orders API] Trying WebSocket server fallback...')
    const orders = await getUserOrders(walletAddress)
    return NextResponse.json({ orders, count: Array.isArray(orders) ? orders.length : 0, source: 'websocket' })
  } catch (error: any) {
    console.error('[Orders API] WebSocket fallback error:', error.message)
    // Fallback to empty array if WebSocket server is not available
    return NextResponse.json({ orders: [], count: 0, source: 'none' })
  }
}

