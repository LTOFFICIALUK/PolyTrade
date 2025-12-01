'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import type { KeyboardEvent } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import Link from 'next/link'

interface PolymarketTrade {
  id: string
  market: string
  asset_id: string
  side: 'BUY' | 'SELL'
  size: string
  price: string
  match_time: string
  outcome: string
  title: string
  transaction_hash?: string
}

interface ClosedPosition {
  conditionId: string
  avgPrice: number
  totalBought: number
  realizedPnl: number
  timestamp: number
  title: string
  outcome: string
}

interface DisplayTrade {
  id: string
  timestamp: string
  market: string
  title: string
  side: string
  sideColor: string
  shares: number
  price: number
  costPerShare: string
  totalCost: string
  pnl: string
  pnlValue: number
  pnlColor: string
  status: 'Open' | 'Closed'
}

interface AnalyticsData {
  totalTrades: number
  winRate: number
  totalPnL: number
  avgTradeCost: number
  avgCostPerShare: number
  avgFrequency: {
    perDay: number
    perWeek: number
  }
  avgProfit: number
  avgLoss: number
  wlRatio: number
  bestTrade: number
  worstTrade: number
  totalWins: number
  totalLosses: number
}

interface PricePointStats {
  price: number
  totalTrades: number
  wins: number
  losses: number
  winRate: number
}

// Custom Dropdown Component
interface CustomDropdownProps {
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
  placeholder?: string
  className?: string
  disabled?: boolean
}

const CustomDropdown = ({ value, onChange, options, placeholder, className = '', disabled = false }: CustomDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const selectedOption = options.find((opt) => opt.value === value)

  const handleSelect = (optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setIsOpen(!isOpen)
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!isOpen) {
        setIsOpen(true)
      } else {
        const currentIndex = options.findIndex((opt) => opt.value === value)
        const nextIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0
        onChange(options[nextIndex].value)
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (isOpen) {
        const currentIndex = options.findIndex((opt) => opt.value === value)
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1
        onChange(options[prevIndex].value)
      }
    }
  }

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={disabled ? undefined : handleKeyDown}
        disabled={disabled}
        className={`w-full pl-3 pr-8 py-2 h-[42px] bg-black border border-gray-800 rounded text-white text-sm leading-normal text-left focus:outline-none focus:ring-2 focus:ring-purple-primary focus:border-transparent transition-colors ${
          disabled ? 'opacity-50 cursor-not-allowed' : isOpen ? 'border-purple-primary/50' : 'hover:border-gray-700'
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="block truncate">
          {selectedOption ? selectedOption.label : placeholder || 'Select...'}
        </span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-30 w-full mt-1 bg-black border border-gray-800 rounded shadow-lg max-h-60 overflow-auto">
          <ul role="listbox" className="py-1">
            {options.map((option) => (
              <li
                key={option.value}
                onClick={() => handleSelect(option.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleSelect(option.value)
                  }
                }}
                className={`px-3 py-2 cursor-pointer transition-colors ${
                  value === option.value
                    ? 'bg-purple-primary/20 text-purple-primary'
                    : 'text-white hover:bg-gray-900/50'
                }`}
                role="option"
                aria-selected={value === option.value}
              >
                <div className="flex items-center justify-between">
                  <span>{option.label}</span>
                  {value === option.value && (
                    <svg className="w-4 h-4 text-purple-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default function AnalyticsPage() {
  const { walletAddress, isConnected } = useWallet()
  const [activeTab, setActiveTab] = useState<'overview' | 'trades' | 'performance'>('overview')
  const [expandedTrade, setExpandedTrade] = useState<string | null>(null)
  const [selectedTrade, setSelectedTrade] = useState<DisplayTrade | null>(null)
  const [hoveredPrice, setHoveredPrice] = useState<number | null>(null)
  const [selectedPricePoint, setSelectedPricePoint] = useState<number | null>(null)
  const [timeRange, setTimeRange] = useState<string>('all')
  
  // Data state
  const [trades, setTrades] = useState<DisplayTrade[]>([])
  const [closedPositions, setClosedPositions] = useState<ClosedPosition[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const timeRanges = [
    { value: 'all', label: 'All Time' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
  ]

  const formatTimestamp = (timestamp: string | number): string => {
    const date = typeof timestamp === 'number' 
      ? new Date(timestamp * 1000) 
      : new Date(timestamp)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatPrice = (price: string | number): string => {
    const priceNum = typeof price === 'string' ? parseFloat(price) : price
    const cents = Math.round(priceNum * 100)
    return `${cents}¢`
  }

  const transformTrade = useCallback((trade: PolymarketTrade): DisplayTrade => {
    const price = parseFloat(trade.price)
    const size = parseFloat(trade.size)
    const totalCost = price * size

    const isBuy = trade.side === 'BUY'
    const isYes = trade.outcome?.toLowerCase() === 'yes'
    
    let sideDisplay: string
    let sideColor: string

    if (isBuy && isYes) {
      sideDisplay = 'Buy Yes'
      sideColor = 'text-green-400'
    } else if (isBuy && !isYes) {
      sideDisplay = 'Buy No'
      sideColor = 'text-red-400'
    } else if (!isBuy && isYes) {
      sideDisplay = 'Sell Yes'
      sideColor = 'text-red-400'
    } else {
      sideDisplay = 'Sell No'
      sideColor = 'text-green-400'
    }

    return {
      id: trade.id,
      timestamp: formatTimestamp(trade.match_time),
      market: trade.market,
      title: trade.title || 'Unknown Market',
      side: sideDisplay,
      sideColor,
      shares: size,
      price: price,
      costPerShare: formatPrice(price),
      totalCost: `$${totalCost.toFixed(2)}`,
      pnl: '-',
      pnlValue: 0,
      pnlColor: 'text-gray-400',
      status: 'Open',
    }
  }, [])

  const fetchData = useCallback(async () => {
    if (!walletAddress) return

    setLoading(true)
    setError(null)

    try {
      // Fetch trades and closed positions in parallel
      const [tradesRes, closedRes] = await Promise.all([
        fetch(`/api/user/trades?address=${walletAddress}&limit=500`),
        fetch(`/api/user/closed-positions?address=${walletAddress}&limit=100`),
      ])

      if (tradesRes.ok) {
        const tradesData = await tradesRes.json()
        const transformedTrades = (tradesData.trades || []).map(transformTrade)
        setTrades(transformedTrades)
      }

      if (closedRes.ok) {
        const closedData = await closedRes.json()
        setClosedPositions(closedData.positions || [])
      }
    } catch (err) {
      console.error('Error fetching analytics data:', err)
      setError('Failed to load analytics data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [walletAddress, transformTrade])

  useEffect(() => {
    if (isConnected && walletAddress) {
      fetchData()
    } else {
      setTrades([])
      setClosedPositions([])
      setLoading(false)
    }
  }, [isConnected, walletAddress, fetchData])

  // Calculate analytics from real data
  const analyticsData = useMemo((): AnalyticsData => {
    // Filter closed positions for winners and losers
    const wins = closedPositions.filter((p) => p.realizedPnl > 0)
    const losses = closedPositions.filter((p) => p.realizedPnl < 0)
    
    const totalTrades = trades.length
    const totalClosedPositions = closedPositions.length
    const winRate = totalClosedPositions > 0 
      ? (wins.length / totalClosedPositions) * 100 
      : 0
    
    const totalPnL = closedPositions.reduce((sum, p) => sum + p.realizedPnl, 0)
    
    // Calculate average trade cost from trades
    const tradeCosts = trades.map((t) => {
      const cost = parseFloat(t.totalCost.replace('$', ''))
      return isNaN(cost) ? 0 : cost
    })
    const avgTradeCost = tradeCosts.length > 0 
      ? tradeCosts.reduce((a, b) => a + b, 0) / tradeCosts.length 
      : 0

    // Average price per share
    const avgCostPerShare = trades.length > 0
      ? trades.reduce((sum, t) => sum + t.price, 0) / trades.length
      : 0

    // Calculate trading frequency
    const timestamps = trades.map((t) => new Date(t.timestamp).getTime())
    let perDay = 0
    let perWeek = 0
    
    if (timestamps.length > 1) {
      const minTime = Math.min(...timestamps)
      const maxTime = Math.max(...timestamps)
      const daysDiff = Math.max(1, (maxTime - minTime) / (1000 * 60 * 60 * 24))
      perDay = totalTrades / daysDiff
      perWeek = perDay * 7
    }

    // Average profit/loss from closed positions
    const avgProfit = wins.length > 0
      ? wins.reduce((sum, p) => sum + p.realizedPnl, 0) / wins.length
      : 0
    
    const avgLoss = losses.length > 0
      ? losses.reduce((sum, p) => sum + p.realizedPnl, 0) / losses.length
      : 0

    // W/L Ratio
    const wlRatio = losses.length > 0 && avgLoss !== 0
      ? Math.abs(avgProfit / avgLoss)
      : avgProfit > 0 ? Infinity : 0

    // Best/worst trades
    const pnlValues = closedPositions.map((p) => p.realizedPnl)
    const bestTrade = pnlValues.length > 0 ? Math.max(...pnlValues) : 0
    const worstTrade = pnlValues.length > 0 ? Math.min(...pnlValues) : 0

    return {
      totalTrades,
      winRate: Math.round(winRate * 10) / 10,
      totalPnL: Math.round(totalPnL * 100) / 100,
      avgTradeCost: Math.round(avgTradeCost * 100) / 100,
      avgCostPerShare: Math.round(avgCostPerShare * 100) / 100,
      avgFrequency: {
        perDay: Math.round(perDay * 10) / 10,
        perWeek: Math.round(perWeek * 10) / 10,
      },
      avgProfit: Math.round(avgProfit * 100) / 100,
      avgLoss: Math.round(avgLoss * 100) / 100,
      wlRatio: Math.round(wlRatio * 100) / 100,
      bestTrade: Math.round(bestTrade * 100) / 100,
      worstTrade: Math.round(worstTrade * 100) / 100,
      totalWins: wins.length,
      totalLosses: losses.length,
    }
  }, [trades, closedPositions])

  // Calculate win rate by price point
  const pricePointStats = useMemo(() => {
    const stats: Record<number, { total: number; wins: number; losses: number }> = {}

    // Initialize all price points
    for (let i = 1; i <= 99; i++) {
      stats[i] = { total: 0, wins: 0, losses: 0 }
    }

    // Use closed positions which have PnL data
    closedPositions.forEach((position) => {
      const price = Math.round(position.avgPrice * 100)
      if (price >= 1 && price <= 99) {
        stats[price].total++
        if (position.realizedPnl > 0) {
          stats[price].wins++
        } else if (position.realizedPnl < 0) {
          stats[price].losses++
        }
      }
    })

    return Object.keys(stats)
      .map((price) => {
        const priceNum = parseInt(price)
        const stat = stats[priceNum]
        const winRate = stat.total > 0 ? (stat.wins / stat.total) * 100 : 0
        return {
          price: priceNum,
          totalTrades: stat.total,
          wins: stat.wins,
          losses: stat.losses,
          winRate: winRate,
        }
      })
      .sort((a, b) => a.price - b.price)
  }, [closedPositions])

  const handleTradeClick = (trade: DisplayTrade) => {
    if (expandedTrade === trade.id) {
      setExpandedTrade(null)
      setSelectedTrade(null)
    } else {
      setExpandedTrade(trade.id)
      setSelectedTrade(trade)
    }
  }

  const closeTradeDetail = () => {
    setExpandedTrade(null)
    setSelectedTrade(null)
  }

  const handlePricePointClick = (price: number) => {
    setSelectedPricePoint(price)
  }

  const closePricePointModal = () => {
    setSelectedPricePoint(null)
  }

  // Get color for win rate (heatmap style)
  const getWinRateColor = (winRate: number, totalTrades: number) => {
    if (totalTrades === 0) {
      return 'bg-gray-900 border-gray-800'
    }
    if (winRate >= 70) {
      return 'bg-green-600/80 border-green-500'
    } else if (winRate >= 60) {
      return 'bg-green-500/60 border-green-400'
    } else if (winRate >= 50) {
      return 'bg-yellow-500/60 border-yellow-400'
    } else if (winRate >= 40) {
      return 'bg-orange-500/60 border-orange-400'
    } else {
      return 'bg-red-500/60 border-red-400'
    }
  }

  const getTextColor = (winRate: number, totalTrades: number) => {
    if (totalTrades === 0) {
      return 'text-gray-600'
    }
    return 'text-white'
  }

  // Get trades for selected price point
  const getTradesForPricePoint = (price: number): ClosedPosition[] => {
    return closedPositions.filter((position) => {
      const posPrice = Math.round(position.avgPrice * 100)
      return posPrice === price
    })
  }

  // Not connected state
  if (!isConnected) {
    return (
      <div className="bg-black text-white min-h-screen">
        <div className="px-4 sm:px-6 py-6 sm:py-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-6">Analytics</h1>
          <div className="py-16 text-center">
            <h2 className="text-base font-medium text-gray-400 mb-1">Wallet Not Connected</h2>
            <p className="text-sm text-gray-500">
              Connect your wallet to view your trading analytics.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="bg-black text-white min-h-screen">
        <div className="px-4 sm:px-6 py-6 sm:py-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-6">Analytics</h1>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <svg className="w-12 h-12 animate-spin text-purple-primary mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-gray-400">Loading your analytics...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-black text-white min-h-screen">
      <div className="px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Analytics</h1>
              <p className="text-sm text-gray-400 mt-1">
                Your trading performance insights
              </p>
            </div>
            <div className="flex items-center gap-3">
              <CustomDropdown
                value={timeRange}
                onChange={(value) => setTimeRange(value)}
                options={timeRanges}
                placeholder="Time Range"
                className="w-40"
              />
              <button
                onClick={fetchData}
                className="px-4 py-2 bg-gray-900 border border-gray-800 rounded text-sm text-gray-400 hover:text-white hover:border-gray-700 transition-colors"
                aria-label="Refresh data"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-6">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-gray-800">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-3 text-sm font-semibold transition-colors relative ${
                activeTab === 'overview' ? 'text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Overview
              {activeTab === 'overview' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-primary" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('trades')}
              className={`px-4 py-3 text-sm font-semibold transition-colors relative ${
                activeTab === 'trades' ? 'text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Trade Details
              {activeTab === 'trades' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-primary" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className={`px-4 py-3 text-sm font-semibold transition-colors relative ${
                activeTab === 'performance' ? 'text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Performance
              {activeTab === 'performance' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-primary" />
              )}
            </button>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {trades.length === 0 && closedPositions.length === 0 ? (
              <div className="py-16 text-center">
                <h2 className="text-base font-medium text-gray-400 mb-1">No Trading Data</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Start trading on Polymarket to see your analytics here.
                </p>
                <Link
                  href="/terminal"
                  className="inline-block px-6 py-2.5 bg-purple-primary hover:bg-purple-hover text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Go to Terminal
                </Link>
              </div>
            ) : (
              <>
                <div>
                  <h2 className="text-lg font-semibold mb-4 text-gray-300">
                    Performance Summary
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
                      <div className="text-xs text-gray-400 mb-1">Total Trades</div>
                      <div className="text-white font-bold text-2xl">{analyticsData.totalTrades}</div>
                      <div className="text-xs text-gray-500 mt-1">All-time</div>
                    </div>

                    <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
                      <div className="text-xs text-gray-400 mb-1">Win Rate</div>
                      <div className={`font-bold text-2xl ${analyticsData.winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                        {analyticsData.winRate}%
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {analyticsData.totalWins}W / {analyticsData.totalLosses}L
                      </div>
                    </div>

                    <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
                      <div className="text-xs text-gray-400 mb-1">Total PnL</div>
                      <div className={`font-bold text-2xl ${analyticsData.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {analyticsData.totalPnL >= 0 ? '+' : ''}${analyticsData.totalPnL.toFixed(2)}
                      </div>
                    </div>

                    <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
                      <div className="text-xs text-gray-400 mb-1">Avg Trade Cost</div>
                      <div className="text-white font-bold text-2xl">
                        ${analyticsData.avgTradeCost.toFixed(2)}
                      </div>
                    </div>

                    <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
                      <div className="text-xs text-gray-400 mb-1">Avg Price/Share</div>
                      <div className="text-white font-bold text-2xl">
                        {Math.round(analyticsData.avgCostPerShare * 100)}¢
                      </div>
                    </div>

                    <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
                      <div className="text-xs text-gray-400 mb-1">Trading Frequency</div>
                      <div className="text-white font-bold text-xl">
                        {analyticsData.avgFrequency.perDay}x/day
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {analyticsData.avgFrequency.perWeek}x/week
                      </div>
                    </div>

                    <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
                      <div className="text-xs text-gray-400 mb-1">Avg Profit</div>
                      <div className="text-green-400 font-bold text-2xl">
                        +${analyticsData.avgProfit.toFixed(2)}
                      </div>
                    </div>

                    <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
                      <div className="text-xs text-gray-400 mb-1">Avg Loss</div>
                      <div className="text-red-400 font-bold text-2xl">
                        ${analyticsData.avgLoss.toFixed(2)}
                      </div>
                    </div>

                    <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
                      <div className="text-xs text-gray-400 mb-1">W/L Ratio</div>
                      <div className="text-white font-bold text-2xl">
                        {analyticsData.wlRatio === Infinity ? '∞' : analyticsData.wlRatio.toFixed(2)}
                      </div>
                    </div>

                    <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
                      <div className="text-xs text-gray-400 mb-1">Best Trade</div>
                      <div className="text-green-400 font-bold text-2xl">
                        +${analyticsData.bestTrade.toFixed(2)}
                      </div>
                    </div>

                    <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
                      <div className="text-xs text-gray-400 mb-1">Worst Trade</div>
                      <div className="text-red-400 font-bold text-2xl">
                        ${analyticsData.worstTrade.toFixed(2)}
                      </div>
                    </div>

                    <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
                      <div className="text-xs text-gray-400 mb-1">Closed Positions</div>
                      <div className="text-white font-bold text-2xl">
                        {closedPositions.length}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Trades Tab */}
        {activeTab === 'trades' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-300">Recent Trades</h2>
              <div className="text-sm text-gray-400">
                {trades.length} trades loaded
              </div>
            </div>

            {trades.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-gray-500">No trades found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-gray-400 border-b border-gray-800">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium">Time</th>
                      <th className="text-left py-3 px-4 font-medium">Market</th>
                      <th className="text-left py-3 px-4 font-medium">Side</th>
                      <th className="text-right py-3 px-4 font-medium">Shares</th>
                      <th className="text-right py-3 px-4 font-medium">Price</th>
                      <th className="text-right py-3 px-4 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.slice(0, 50).map((trade) => (
                      <tr
                        key={trade.id}
                        onClick={() => handleTradeClick(trade)}
                        className="border-b border-gray-800 hover:bg-gray-900/30 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4 text-gray-400 whitespace-nowrap">{trade.timestamp}</td>
                        <td className="py-3 px-4">
                          <div className="max-w-xs truncate text-white" title={trade.title}>
                            {trade.title}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={trade.sideColor}>{trade.side}</span>
                        </td>
                        <td className="py-3 px-4 text-right text-white font-mono">
                          {trade.shares.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right text-white font-mono">
                          {trade.costPerShare}
                        </td>
                        <td className="py-3 px-4 text-right text-white font-mono">
                          {trade.totalCost}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Performance Tab */}
        {activeTab === 'performance' && (
          <div className="space-y-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-300 mb-2">
                Win Rate by Entry Price
              </h2>
              <p className="text-sm text-gray-400 mb-2">
                Each cell shows your win rate for positions entered at that price point (1¢ - 99¢).
              </p>
              {closedPositions.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-gray-500">
                    No closed positions to analyze. Complete some trades to see your performance by price point.
                  </p>
                </div>
              ) : (
                <>
                  {/* Legend */}
                  <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800 mb-4">
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <span className="text-gray-400">Win Rate:</span>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-500/60 border border-red-400 rounded"></div>
                        <span className="text-gray-300">&lt;40%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-orange-500/60 border border-orange-400 rounded"></div>
                        <span className="text-gray-300">40-50%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-yellow-500/60 border border-yellow-400 rounded"></div>
                        <span className="text-gray-300">50-60%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-500/60 border border-green-400 rounded"></div>
                        <span className="text-gray-300">60-70%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-600/80 border border-green-500 rounded"></div>
                        <span className="text-gray-300">≥70%</span>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <div className="w-4 h-4 bg-gray-900 border border-gray-800 rounded"></div>
                        <span className="text-gray-300">No data</span>
                      </div>
                    </div>
                  </div>

                  {/* Price Grid */}
                  <div className="bg-gray-900/50 rounded-lg p-4 sm:p-6 border border-gray-800">
                    <div className="space-y-1 sm:space-y-2">
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((tens) => (
                        <div key={tens} className="grid grid-cols-10 gap-1 sm:gap-2">
                          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((ones) => {
                            const price = tens * 10 + ones
                            if (price === 0) return <div key={ones}></div>
                            if (price > 99) return null

                            const stat = pricePointStats.find((s) => s.price === price) || {
                              price,
                              totalTrades: 0,
                              wins: 0,
                              losses: 0,
                              winRate: 0,
                            }

                            return (
                              <div
                                key={ones}
                                className={`relative aspect-square rounded border transition-all cursor-pointer group ${getWinRateColor(
                                  stat.winRate,
                                  stat.totalTrades
                                )} ${hoveredPrice === price ? 'ring-2 ring-purple-primary ring-offset-2 ring-offset-gray-900 scale-105 z-10' : ''}`}
                                onMouseEnter={() => setHoveredPrice(price)}
                                onMouseLeave={() => setHoveredPrice(null)}
                                onClick={() => stat.totalTrades > 0 && handlePricePointClick(price)}
                              >
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-1">
                                  <div className="absolute top-0.5 left-0.5 text-[8px] text-gray-400 opacity-60">
                                    {price}¢
                                  </div>
                                  <div
                                    className={`text-[10px] sm:text-xs font-semibold ${getTextColor(
                                      stat.winRate,
                                      stat.totalTrades
                                    )}`}
                                  >
                                    {stat.totalTrades > 0 ? `${stat.winRate.toFixed(0)}%` : ''}
                                  </div>
                                  {stat.totalTrades > 0 && (
                                    <div
                                      className={`text-[8px] sm:text-[10px] ${getTextColor(
                                        stat.winRate,
                                        stat.totalTrades
                                      )} opacity-70`}
                                    >
                                      {stat.totalTrades}
                                    </div>
                                  )}
                                </div>

                                {/* Tooltip */}
                                {hoveredPrice === price && (
                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-xl z-20 min-w-[180px]">
                                    <div className="text-sm font-semibold text-white mb-2">
                                      Entry Price: {price}¢
                                    </div>
                                    {stat.totalTrades > 0 ? (
                                      <div className="space-y-1 text-xs">
                                        <div className="flex justify-between">
                                          <span className="text-gray-400">Win Rate:</span>
                                          <span className="text-white font-semibold">
                                            {stat.winRate.toFixed(1)}%
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-400">Positions:</span>
                                          <span className="text-white">{stat.totalTrades}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-400">Wins:</span>
                                          <span className="text-green-400">{stat.wins}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-400">Losses:</span>
                                          <span className="text-red-400">{stat.losses}</span>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-xs text-gray-400">
                                        No positions at this price
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      ))}
                    </div>

                    {/* Summary Stats */}
                    <div className="mt-6 pt-6 border-t border-gray-800">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-black/50 rounded-lg p-3 border border-gray-800">
                          <div className="text-xs text-gray-400 mb-1">Best Price Range</div>
                          <div className="text-white font-semibold text-sm">
                            {(() => {
                              const bestStats = pricePointStats
                                .filter((s) => s.totalTrades >= 2)
                                .sort((a, b) => b.winRate - a.winRate)
                              return bestStats.length > 0 
                                ? `${bestStats[0].price}¢ (${bestStats[0].winRate.toFixed(0)}%)`
                                : 'N/A'
                            })()}
                          </div>
                        </div>
                        <div className="bg-black/50 rounded-lg p-3 border border-gray-800">
                          <div className="text-xs text-gray-400 mb-1">Most Traded</div>
                          <div className="text-white font-semibold text-sm">
                            {(() => {
                              const mostTraded = pricePointStats
                                .filter((s) => s.totalTrades > 0)
                                .sort((a, b) => b.totalTrades - a.totalTrades)
                              return mostTraded.length > 0 
                                ? `${mostTraded[0].price}¢ (${mostTraded[0].totalTrades} trades)`
                                : 'N/A'
                            })()}
                          </div>
                        </div>
                        <div className="bg-black/50 rounded-lg p-3 border border-gray-800">
                          <div className="text-xs text-gray-400 mb-1">Worst Price Range</div>
                          <div className="text-white font-semibold text-sm">
                            {(() => {
                              const worstStats = pricePointStats
                                .filter((s) => s.totalTrades >= 2)
                                .sort((a, b) => a.winRate - b.winRate)
                              return worstStats.length > 0 
                                ? `${worstStats[0].price}¢ (${worstStats[0].winRate.toFixed(0)}%)`
                                : 'N/A'
                            })()}
                          </div>
                        </div>
                        <div className="bg-black/50 rounded-lg p-3 border border-gray-800">
                          <div className="text-xs text-gray-400 mb-1">Price Points Used</div>
                          <div className="text-white font-semibold text-sm">
                            {pricePointStats.filter((s) => s.totalTrades > 0).length}/99
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Price Point Detail Modal */}
      {selectedPricePoint !== null && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={closePricePointModal}
        >
          <div
            className="bg-black border border-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-black">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Entry Price: {selectedPricePoint}¢
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  Positions entered at this price point
                </p>
              </div>
              <button
                onClick={closePricePointModal}
                className="text-gray-400 hover:text-white transition-colors p-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-black">
              {(() => {
                const pricePositions = getTradesForPricePoint(selectedPricePoint)
                const priceStat = pricePointStats.find((s) => s.price === selectedPricePoint) || {
                  price: selectedPricePoint,
                  totalTrades: 0,
                  wins: 0,
                  losses: 0,
                  winRate: 0,
                }

                return (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-black/50 rounded-lg p-4 border border-gray-800">
                        <div className="text-xs text-gray-400 mb-1">Total Positions</div>
                        <div className="text-white font-bold text-2xl">{priceStat.totalTrades}</div>
                      </div>
                      <div className="bg-black/50 rounded-lg p-4 border border-gray-800">
                        <div className="text-xs text-gray-400 mb-1">Win Rate</div>
                        <div className={`font-bold text-2xl ${priceStat.winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                          {priceStat.winRate.toFixed(1)}%
                        </div>
                      </div>
                      <div className="bg-black/50 rounded-lg p-4 border border-gray-800">
                        <div className="text-xs text-gray-400 mb-1">Wins</div>
                        <div className="text-green-400 font-bold text-2xl">{priceStat.wins}</div>
                      </div>
                      <div className="bg-black/50 rounded-lg p-4 border border-gray-800">
                        <div className="text-xs text-gray-400 mb-1">Losses</div>
                        <div className="text-red-400 font-bold text-2xl">{priceStat.losses}</div>
                      </div>
                    </div>

                    {pricePositions.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-3">Position History</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="text-gray-400 border-b border-gray-800">
                              <tr>
                                <th className="text-left py-3 px-4 font-medium">Closed</th>
                                <th className="text-left py-3 px-4 font-medium">Market</th>
                                <th className="text-left py-3 px-4 font-medium">Outcome</th>
                                <th className="text-right py-3 px-4 font-medium">Avg Price</th>
                                <th className="text-right py-3 px-4 font-medium">Total Bought</th>
                                <th className="text-right py-3 px-4 font-medium">PnL</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pricePositions.map((position, index) => {
                                const pnl = position.realizedPnl
                                const pnlColor = pnl >= 0 ? 'text-green-400' : 'text-red-400'
                                const pnlDisplay = pnl >= 0 ? `+$${pnl.toFixed(2)}` : `-$${Math.abs(pnl).toFixed(2)}`

                                return (
                                  <tr
                                    key={`${position.conditionId}-${index}`}
                                    className="border-b border-gray-800 hover:bg-gray-900/30"
                                  >
                                    <td className="py-3 px-4 text-gray-400">
                                      {formatTimestamp(position.timestamp)}
                                    </td>
                                    <td className="py-3 px-4 text-white truncate max-w-xs">
                                      {position.title}
                                    </td>
                                    <td className="py-3 px-4">
                                      <span className={position.outcome === 'Yes' ? 'text-green-400' : 'text-red-400'}>
                                        {position.outcome}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 text-right text-white font-mono">
                                      {Math.round(position.avgPrice * 100)}¢
                                    </td>
                                    <td className="py-3 px-4 text-right text-white font-mono">
                                      ${position.totalBought.toFixed(2)}
                                    </td>
                                    <td className={`py-3 px-4 text-right font-mono font-semibold ${pnlColor}`}>
                                      {pnlDisplay}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

