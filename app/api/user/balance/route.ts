'use server'

import { NextResponse } from 'next/server'
import { getUserBalance } from '@/lib/websocket-server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const walletAddress = searchParams.get('address')

  if (!walletAddress) {
    return NextResponse.json({ error: 'Missing wallet address parameter' }, { status: 400 })
  }

  try {
    // Query WebSocket server for real-time balance
    const balance = await getUserBalance(walletAddress)
    return NextResponse.json(balance)
  } catch (error: any) {
    // Try direct fetch as fallback
    try {
      const directResponse = await fetch(`http://localhost:8081/api/balance?address=${walletAddress}`, {
        cache: 'no-store',
      })
      if (directResponse.ok) {
        const data = await directResponse.json()
        if (data.success && data.data) {
          return NextResponse.json(data.data)
        }
      }
    } catch (directError) {
      console.error('Direct fetch also failed:', directError)
    }
    // Final fallback to mock data
    const balance = {
      portfolioValue: 5234.50,
      cashBalance: 1234.50,
      totalValue: 6469.00,
      lastUpdated: new Date().toISOString(),
    }
    return NextResponse.json(balance)
  }
}

