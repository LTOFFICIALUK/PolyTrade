'use client'

import { useState, useEffect } from 'react'

interface ProfileStats {
  totalTrades: number
  winRate: number
  totalPnL: number
  portfolioValue: number
  cashBalance: number
  activePositions: number
  favoriteStrategy: string
  joinDate: string
}

interface BalanceData {
  portfolioValue: number
  cashBalance: number
  totalValue: number
  lastUpdated: string
}

interface Position {
  tokenId: string
  market: string
  side: string
  shares: number
  avgPrice: number
  currentPrice: number
  pnl: number
}

interface Trade {
  tradeId: string
  tokenId: string
  market: string
  side: string
  shares: number
  price: number
  timestamp: string
  outcome: string
  pnl: number
}

export default function ProfilePage({
  params,
}: {
  params: { address: string }
}) {
  const { address } = params
  const [balance, setBalance] = useState<BalanceData | null>(null)
  const [positions, setPositions] = useState<Position[]>([])
  const [history, setHistory] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch balance
        const balanceRes = await fetch(`/api/user/balance?address=${address}`)
        const balanceData = await balanceRes.json()
        setBalance(balanceData)

        // Fetch positions
        const positionsRes = await fetch(`/api/user/positions?address=${address}`)
        const positionsData = await positionsRes.json()
        setPositions(positionsData.positions || [])

        // Fetch history
        const historyRes = await fetch(`/api/user/history?address=${address}&limit=100`)
        const historyData = await historyRes.json()
        setHistory(historyData.trades || [])
      } catch (error) {
        console.error('Error fetching profile data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [address])

  // Calculate stats from real data
  const calculateStats = (): ProfileStats => {
    const totalTrades = history.length
    const wins = history.filter((t) => t.outcome === 'WIN').length
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0
    const totalPnL = history.reduce((sum, t) => sum + (t.pnl || 0), 0)
    const portfolioValue = balance?.portfolioValue || 0
    const cashBalance = balance?.cashBalance || 0
    const activePositions = positions.length

    // Find most used strategy (mock for now)
    const favoriteStrategy = 'Momentum Breakout'

    return {
      totalTrades,
      winRate: Math.round(winRate * 10) / 10,
      totalPnL: Math.round(totalPnL * 100) / 100,
      portfolioValue,
      cashBalance,
      activePositions,
      favoriteStrategy,
      joinDate: '2024-01-01', // Would come from user data
    }
  }

  const profileStats = calculateStats()

  // Format wallet address for display
  const formatAddress = (addr: string) => {
    if (addr.length <= 10) return addr
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  // Copy address to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(address)
    // Could add a toast notification here
  }

  return (
    <div className="bg-black text-white min-h-screen">
      <div className="px-4 sm:px-6 py-6 sm:py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">Profile</h1>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-black/50 border border-gray-800 rounded-lg px-4 py-2">
                  <span className="text-gray-400 text-sm">Wallet:</span>
                  <span className="text-white font-mono text-sm">{formatAddress(address)}</span>
                  <button
                    onClick={copyToClipboard}
                    className="text-gray-400 hover:text-white transition-colors ml-2"
                    title="Copy full address"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </button>
                </div>
                <a
                  href={`https://polygonscan.com/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-primary hover:text-purple-hover text-sm font-medium transition-colors"
                >
                  View on PolygonScan →
                </a>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-xs text-gray-400">Member Since</div>
                <div className="text-white font-semibold">
                  {new Date(profileStats.joinDate).toLocaleDateString('en-US', {
                    month: 'short',
                    year: 'numeric',
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-black/50 rounded-lg p-4 border border-gray-800">
            <div className="text-xs text-gray-400 mb-1">Total Trades</div>
            <div className="text-white font-bold text-2xl">{profileStats.totalTrades}</div>
          </div>

          <div className="bg-black/50 rounded-lg p-4 border border-gray-800">
            <div className="text-xs text-gray-400 mb-1">Win Rate</div>
            <div className="text-green-400 font-bold text-2xl">
              {profileStats.winRate}%
            </div>
          </div>

          <div className="bg-black/50 rounded-lg p-4 border border-gray-800">
            <div className="text-xs text-gray-400 mb-1">Total PnL</div>
            <div className="text-green-400 font-bold text-2xl">
              +${profileStats.totalPnL.toFixed(2)}
            </div>
          </div>

          <div className="bg-black/50 rounded-lg p-4 border border-gray-800">
            <div className="text-xs text-gray-400 mb-1">Portfolio Value</div>
            <div className="text-white font-bold text-2xl">
              ${profileStats.portfolioValue.toFixed(2)}
            </div>
          </div>

          <div className="bg-black/50 rounded-lg p-4 border border-gray-800">
            <div className="text-xs text-gray-400 mb-1">Cash Balance</div>
            <div className="text-white font-bold text-2xl">
              ${profileStats.cashBalance.toFixed(2)}
            </div>
          </div>

          <div className="bg-black/50 rounded-lg p-4 border border-gray-800">
            <div className="text-xs text-gray-400 mb-1">Active Positions</div>
            <div className="text-white font-bold text-2xl">
              {profileStats.activePositions}
            </div>
          </div>

          <div className="bg-black/50 rounded-lg p-4 border border-gray-800">
            <div className="text-xs text-gray-400 mb-1">Favorite Strategy</div>
            <div className="text-white font-bold text-lg">
              {profileStats.favoriteStrategy}
            </div>
          </div>
        </div>

        {/* Additional Info Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trading Activity */}
          <div className="bg-black/50 rounded-lg p-6 border border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-4">Trading Activity</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Total Volume Traded</span>
                <span className="text-white font-semibold">$45,230.50</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Avg Trade Size</span>
                <span className="text-white font-semibold">$183.12</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Best Trade</span>
                <span className="text-green-400 font-semibold">+$89.50</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Worst Trade</span>
                <span className="text-red-400 font-semibold">-$23.40</span>
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="bg-black/50 rounded-lg p-6 border border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-4">Performance Metrics</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">W/L Ratio</span>
                <span className="text-white font-semibold">2.01</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Avg Profit</span>
                <span className="text-green-400 font-semibold">+$12.45</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Avg Loss</span>
                <span className="text-red-400 font-semibold">-$6.20</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Profit Factor</span>
                <span className="text-white font-semibold">2.10</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

