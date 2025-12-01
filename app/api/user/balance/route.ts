'use server'

import { NextResponse } from 'next/server'

const POLYMARKET_DATA_API = 'https://data-api.polymarket.com'

// USDC.e contract on Polygon - This is what Polymarket uses for collateral
// Note: Polymarket uses USDC.e (bridged), NOT native USDC
const USDC_E = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' // USDC.e (Bridged) - Polymarket collateral
const POLYGON_RPC = 'https://polygon-rpc.com'

// ERC-20 balanceOf function selector
const BALANCE_OF_SELECTOR = '0x70a08231'

async function getTokenBalance(
  rpcUrl: string, 
  tokenContract: string, 
  walletAddress: string
): Promise<number> {
  try {
    // Format wallet address for balanceOf call (remove 0x, pad to 64 chars)
    const addressPadded = walletAddress.slice(2).toLowerCase().padStart(64, '0')
    const callData = BALANCE_OF_SELECTOR + addressPadded
    
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{
          to: tokenContract,
          data: callData,
        }, 'latest'],
        id: 1,
      }),
    })

    if (response.ok) {
      const data = await response.json()
      if (data.result && data.result !== '0x') {
        // USDC has 6 decimals
        const balanceWei = BigInt(data.result)
        return Number(balanceWei) / 1e6
      }
    }
  } catch (e) {
    console.error(`Token balance fetch failed for ${tokenContract}:`, e)
  }
  return 0
}

async function getNativeBalance(rpcUrl: string, walletAddress: string): Promise<number> {
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getBalance',
        params: [walletAddress, 'latest'],
        id: 1,
      }),
    })

    if (response.ok) {
      const data = await response.json()
      if (data.result) {
        // POL/MATIC has 18 decimals
        const balanceWei = BigInt(data.result)
        return Number(balanceWei) / 1e18
      }
    }
  } catch (e) {
    console.error('Native balance fetch failed:', e)
  }
  return 0
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const walletAddress = searchParams.get('address')

  if (!walletAddress) {
    return NextResponse.json({ error: 'Missing wallet address parameter' }, { status: 400 })
  }

  // Normalize address to lowercase for consistency
  const normalizedAddress = walletAddress.toLowerCase()

  try {
    // Fetch all balances in parallel
    const [
      usdceBalance,
      polBalance,
      polymarketValue,
    ] = await Promise.all([
      // USDC.e (Bridged) - This is what Polymarket uses
      getTokenBalance(POLYGON_RPC, USDC_E, normalizedAddress),
      // Native POL/MATIC balance
      getNativeBalance(POLYGON_RPC, normalizedAddress),
      // Polymarket position value
      (async () => {
        try {
          const response = await fetch(
            `${POLYMARKET_DATA_API}/value?user=${normalizedAddress}`,
            { 
              headers: { 'Accept': 'application/json' },
              cache: 'no-store' 
            }
          )
          if (response.ok) {
            const data = await response.json()
            // API returns array: [{ user: string, value: number }]
            if (Array.isArray(data) && data.length > 0) {
              return parseFloat(data[0].value || '0')
            }
            return parseFloat(data.value || data.totalValue || '0')
          }
        } catch (e) {
          console.error('Polymarket value fetch failed:', e)
        }
        return 0
      })(),
    ])

    // Total portfolio = USDC.e + Polymarket positions
    const portfolioValue = usdceBalance + polymarketValue

    return NextResponse.json({
      // Total portfolio value
      portfolioValue,
      // Cash available in wallet (USDC.e for Polymarket trading)
      cashBalance: usdceBalance,
      // Value of positions on Polymarket
      positionsValue: polymarketValue,
      // Detailed breakdown
      breakdown: {
        usdce: usdceBalance,              // USDC.e (Polymarket collateral)
        polBalance: polBalance,            // POL/MATIC for gas
        polymarketPositions: polymarketValue,
      },
      lastUpdated: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Balance fetch error:', error)
    
    return NextResponse.json({
      portfolioValue: 0,
      cashBalance: 0,
      positionsValue: 0,
      breakdown: {
        usdce: 0,
        polBalance: 0,
        polymarketPositions: 0,
      },
      lastUpdated: new Date().toISOString(),
      error: 'Failed to fetch balance',
    })
  }
}
