'use server'

import { NextResponse } from 'next/server'

const POLYMARKET_CLOB_API = 'https://clob.polymarket.com'

// USDC contract on Polygon
const USDC_CONTRACT = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
const POLYGON_RPC = 'https://polygon-rpc.com'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const walletAddress = searchParams.get('address')

  if (!walletAddress) {
    return NextResponse.json({ error: 'Missing wallet address parameter' }, { status: 400 })
  }

  try {
    // Fetch total position value from Polymarket CLOB API
    let positionsValue = 0
    try {
      const valueResponse = await fetch(
        `${POLYMARKET_CLOB_API}/value?user=${walletAddress}`,
        { 
          headers: { 'Accept': 'application/json' },
          cache: 'no-store' 
        }
      )
      if (valueResponse.ok) {
        const valueData = await valueResponse.json()
        positionsValue = parseFloat(valueData.value || valueData.totalValue || '0')
      }
    } catch (e) {
      console.log('Position value fetch failed:', e)
    }

    // Fetch USDC balance directly from Polygon blockchain
    let cashBalance = 0
    try {
      // ERC-20 balanceOf call data
      const balanceOfData = '0x70a08231' + walletAddress.slice(2).padStart(64, '0')
      
      const rpcResponse = await fetch(POLYGON_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_call',
          params: [{
            to: USDC_CONTRACT,
            data: balanceOfData,
          }, 'latest'],
          id: 1,
        }),
      })

      if (rpcResponse.ok) {
        const rpcData = await rpcResponse.json()
        if (rpcData.result) {
          // USDC has 6 decimals
          const balanceWei = BigInt(rpcData.result)
          cashBalance = Number(balanceWei) / 1e6
        }
      }
    } catch (e) {
      console.log('USDC balance fetch failed:', e)
    }

    // Portfolio = positions + cash
    const portfolioValue = positionsValue + cashBalance

    return NextResponse.json({
      portfolioValue,
      cashBalance,
      positionsValue,
      lastUpdated: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Balance fetch error:', error)
    
    return NextResponse.json({
      portfolioValue: 0,
      cashBalance: 0,
      positionsValue: 0,
      lastUpdated: new Date().toISOString(),
    })
  }
}

