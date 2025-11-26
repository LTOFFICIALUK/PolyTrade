'use server'

import { NextResponse } from 'next/server'
import { getUserHistory } from '@/lib/websocket-server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const walletAddress = searchParams.get('address')
  const limit = searchParams.get('limit') || '100'
  const offset = searchParams.get('offset') || '0'

  if (!walletAddress) {
    return NextResponse.json({ error: 'Missing wallet address parameter' }, { status: 400 })
  }

  try {
    // Query WebSocket server for trade history
    const trades = await getUserHistory(
      walletAddress,
      parseInt(limit),
      parseInt(offset)
    )
    
    return NextResponse.json({
      trades: Array.isArray(trades) ? trades : [],
      count: Array.isArray(trades) ? trades.length : 0,
      limit: parseInt(limit),
      offset: parseInt(offset),
    })
  } catch (error: any) {
    // Try direct fetch as fallback
    try {
      const directResponse = await fetch(`http://localhost:8081/api/history?address=${walletAddress}&limit=${limit}&offset=${offset}`, {
        cache: 'no-store',
      })
      if (directResponse.ok) {
        const data = await directResponse.json()
        if (data.success && data.data) {
          return NextResponse.json({
            trades: Array.isArray(data.data) ? data.data : [],
            count: Array.isArray(data.data) ? data.data.length : 0,
            limit: parseInt(limit),
            offset: parseInt(offset),
          })
        }
      }
    } catch (directError) {
      console.error('Direct fetch also failed:', directError)
    }
    return NextResponse.json({
      trades: [],
      count: 0,
      limit: parseInt(limit),
      offset: parseInt(offset),
    })
  }
}

