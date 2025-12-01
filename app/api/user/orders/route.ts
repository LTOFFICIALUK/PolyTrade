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
    try {
      const credentials: PolymarketApiCredentials = JSON.parse(credentialsParam)
      
      // Fetch orders from Polymarket CLOB API
      const response = await makeAuthenticatedRequest(
        'GET',
        '/orders',
        walletAddress,
        credentials
      )

      if (response.ok) {
        const data = await response.json()
        const orders = Array.isArray(data) ? data : (data.orders || [])
        return NextResponse.json({ orders, count: orders.length })
      }
    } catch (error: any) {
      console.error('Polymarket API orders fetch error:', error)
      // Fall through to WebSocket server fallback
    }
  }

  // Fallback to WebSocket server
  try {
    // Query WebSocket server for real-time orders
    const orders = await getUserOrders(walletAddress)
    return NextResponse.json({ orders, count: Array.isArray(orders) ? orders.length : 0 })
  } catch (error: any) {
    console.error('Orders fetch error:', error)
    // Fallback to empty array if WebSocket server is not available
    return NextResponse.json({ orders: [], count: 0 })
  }
}

