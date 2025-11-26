'use server'

import { NextResponse } from 'next/server'
import { getUserOrders } from '@/lib/websocket-server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const walletAddress = searchParams.get('address')

  if (!walletAddress) {
    return NextResponse.json({ error: 'Missing wallet address parameter' }, { status: 400 })
  }

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

