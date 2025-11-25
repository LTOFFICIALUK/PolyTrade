'use server'

import { NextResponse } from 'next/server'
import { getUserPositions } from '@/lib/websocket-server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const walletAddress = searchParams.get('address')

  if (!walletAddress) {
    return NextResponse.json({ error: 'Missing wallet address parameter' }, { status: 400 })
  }

  try {
    // Query WebSocket server for real-time positions
    const positions = await getUserPositions(walletAddress)
    return NextResponse.json({ positions, count: Array.isArray(positions) ? positions.length : 0 })
  } catch (error: any) {
    // Try direct fetch as fallback
    try {
      const directResponse = await fetch(`http://localhost:8081/api/positions?address=${walletAddress}`, {
        cache: 'no-store',
      })
      if (directResponse.ok) {
        const data = await directResponse.json()
        if (data.success && data.data) {
          return NextResponse.json({ positions: data.data, count: Array.isArray(data.data) ? data.data.length : 0 })
        }
      }
    } catch (directError) {
      console.error('Direct fetch also failed:', directError)
    }
    return NextResponse.json({ positions: [], count: 0 })
  }
}

