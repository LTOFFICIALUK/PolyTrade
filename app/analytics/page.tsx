'use client'

import { useState, useMemo, useRef, useEffect, KeyboardEvent } from 'react'

interface Trade {
  id: string
  timestamp: string
  market: string
  asset: string
  side: 'Buy Yes' | 'Sell No' | 'Buy No' | 'Sell Yes'
  sideColor: string
  shares: number
  costPerShare: string
  totalCost: string
  exitPrice?: string
  exitShares?: number
  exitTotal?: string
  pnl: string
  pnlColor: string
  strategy: string
  status: 'Open' | 'Closed'
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

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
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
          <ul
            role="listbox"
            className="py-1"
          >
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

interface PricePointStats {
  price: number
  totalTrades: number
  wins: number
  losses: number
  winRate: number
}

export default function AnalyticsPage() {
  const [selectedStrategy, setSelectedStrategy] = useState<string>('All Strategies')
  const [activeTab, setActiveTab] = useState<'overview' | 'trades' | 'performance'>('overview')
  const [expandedTrade, setExpandedTrade] = useState<string | null>(null)
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null)
  const [hoveredPrice, setHoveredPrice] = useState<number | null>(null)
  const [selectedPricePoint, setSelectedPricePoint] = useState<number | null>(null)

  const strategies = [
    'All Strategies',
    'Momentum Breakout',
    'RSI Reversal',
    'MACD Crossover',
    'Bollinger Squeeze',
    'Volume Surge',
    'Mean Reversion',
  ]

  // Mock analytics data - averages over past 50 trades
  const analyticsData = {
    totalTrades: 247,
    winRate: 68.4,
    totalPnL: 1256.80,
    avgTradeCost: 45.30,
    avgCostPerShare: 0.38,
    avgFrequency: {
      perDay: 1.3,
      perWeek: 3.5,
    },
    avgProfit: 12.45,
    avgLoss: -6.20,
    wlRatio: 2.01,
    bestTrade: 89.50,
    worstTrade: -23.40,
  }

  // Mock trades data
  const trades: Trade[] = [
    {
      id: '1',
      timestamp: '2024-01-15 14:32:15',
      market: 'BTC > $100k',
      asset: 'BTC',
      side: 'Buy Yes',
      sideColor: 'text-green-400',
      shares: 100,
      costPerShare: '45¢',
      totalCost: '$45.00',
      exitPrice: '52¢',
      exitShares: 100,
      exitTotal: '$52.00',
      pnl: '+$7.00',
      pnlColor: 'text-green-400',
      strategy: 'Momentum Breakout',
      status: 'Closed',
    },
    {
      id: '2',
      timestamp: '2024-01-15 13:15:42',
      market: 'ETH > $5k',
      asset: 'ETH',
      side: 'Buy Yes',
      sideColor: 'text-green-400',
      shares: 150,
      costPerShare: '38¢',
      totalCost: '$57.00',
      exitPrice: '42¢',
      exitShares: 150,
      exitTotal: '$63.00',
      pnl: '+$6.00',
      pnlColor: 'text-green-400',
      strategy: 'RSI Reversal',
      status: 'Closed',
    },
    {
      id: '3',
      timestamp: '2024-01-15 12:08:23',
      market: 'SOL > $200',
      asset: 'SOL',
      side: 'Sell No',
      sideColor: 'text-red-400',
      shares: 200,
      costPerShare: '31¢',
      totalCost: '$62.00',
      exitPrice: '28¢',
      exitShares: 200,
      exitTotal: '$56.00',
      pnl: '+$6.00',
      pnlColor: 'text-green-400',
      strategy: 'MACD Crossover',
      status: 'Closed',
    },
    {
      id: '4',
      timestamp: '2024-01-15 11:45:10',
      market: 'XRP > $2',
      asset: 'XRP',
      side: 'Buy Yes',
      sideColor: 'text-green-400',
      shares: 75,
      costPerShare: '42¢',
      totalCost: '$31.50',
      exitPrice: '38¢',
      exitShares: 75,
      exitTotal: '$28.50',
      pnl: '-$3.00',
      pnlColor: 'text-red-400',
      strategy: 'Bollinger Squeeze',
      status: 'Closed',
    },
    {
      id: '5',
      timestamp: '2024-01-15 10:22:55',
      market: 'BTC > $100k',
      asset: 'BTC',
      side: 'Buy Yes',
      sideColor: 'text-green-400',
      shares: 250,
      costPerShare: '40¢',
      totalCost: '$100.00',
      pnl: '+$12.50',
      pnlColor: 'text-green-400',
      strategy: 'Momentum Breakout',
      status: 'Open',
    },
    {
      id: '6',
      timestamp: '2024-01-15 09:15:30',
      market: 'ETH > $5k',
      asset: 'ETH',
      side: 'Buy Yes',
      sideColor: 'text-green-400',
      shares: 180,
      costPerShare: '35¢',
      totalCost: '$63.00',
      exitPrice: '41¢',
      exitShares: 180,
      exitTotal: '$73.80',
      pnl: '+$10.80',
      pnlColor: 'text-green-400',
      strategy: 'RSI Reversal',
      status: 'Closed',
    },
    // Additional trades for 45¢ price point
    {
      id: '7',
      timestamp: '2024-01-14 16:20:12',
      market: 'SOL > $200',
      asset: 'SOL',
      side: 'Buy Yes',
      sideColor: 'text-green-400',
      shares: 120,
      costPerShare: '45¢',
      totalCost: '$54.00',
      exitPrice: '51¢',
      exitShares: 120,
      exitTotal: '$61.20',
      pnl: '+$7.20',
      pnlColor: 'text-green-400',
      strategy: 'Momentum Breakout',
      status: 'Closed',
    },
    {
      id: '8',
      timestamp: '2024-01-14 15:45:33',
      market: 'BTC > $100k',
      asset: 'BTC',
      side: 'Buy Yes',
      sideColor: 'text-green-400',
      shares: 80,
      costPerShare: '45¢',
      totalCost: '$36.00',
      exitPrice: '48¢',
      exitShares: 80,
      exitTotal: '$38.40',
      pnl: '+$2.40',
      pnlColor: 'text-green-400',
      strategy: 'MACD Crossover',
      status: 'Closed',
    },
    {
      id: '9',
      timestamp: '2024-01-14 14:10:05',
      market: 'ETH > $5k',
      asset: 'ETH',
      side: 'Buy Yes',
      sideColor: 'text-green-400',
      shares: 200,
      costPerShare: '45¢',
      totalCost: '$90.00',
      exitPrice: '43¢',
      exitShares: 200,
      exitTotal: '$86.00',
      pnl: '-$4.00',
      pnlColor: 'text-red-400',
      strategy: 'RSI Reversal',
      status: 'Closed',
    },
    // Additional trades for 38¢ price point
    {
      id: '10',
      timestamp: '2024-01-14 13:30:18',
      market: 'XRP > $2',
      asset: 'XRP',
      side: 'Buy Yes',
      sideColor: 'text-green-400',
      shares: 100,
      costPerShare: '38¢',
      totalCost: '$38.00',
      exitPrice: '44¢',
      exitShares: 100,
      exitTotal: '$44.00',
      pnl: '+$6.00',
      pnlColor: 'text-green-400',
      strategy: 'Bollinger Squeeze',
      status: 'Closed',
    },
    {
      id: '11',
      timestamp: '2024-01-14 12:15:42',
      market: 'SOL > $200',
      asset: 'SOL',
      side: 'Buy Yes',
      sideColor: 'text-green-400',
      shares: 175,
      costPerShare: '38¢',
      totalCost: '$66.50',
      exitPrice: '41¢',
      exitShares: 175,
      exitTotal: '$71.75',
      pnl: '+$5.25',
      pnlColor: 'text-green-400',
      strategy: 'RSI Reversal',
      status: 'Closed',
    },
    {
      id: '12',
      timestamp: '2024-01-14 11:00:28',
      market: 'BTC > $100k',
      asset: 'BTC',
      side: 'Buy Yes',
      sideColor: 'text-green-400',
      shares: 90,
      costPerShare: '38¢',
      totalCost: '$34.20',
      exitPrice: '35¢',
      exitShares: 90,
      exitTotal: '$31.50',
      pnl: '-$2.70',
      pnlColor: 'text-red-400',
      strategy: 'Volume Surge',
      status: 'Closed',
    },
    // Additional trades for 35¢ price point
    {
      id: '13',
      timestamp: '2024-01-13 17:25:50',
      market: 'ETH > $5k',
      asset: 'ETH',
      side: 'Buy Yes',
      sideColor: 'text-green-400',
      shares: 140,
      costPerShare: '35¢',
      totalCost: '$49.00',
      exitPrice: '39¢',
      exitShares: 140,
      exitTotal: '$54.60',
      pnl: '+$5.60',
      pnlColor: 'text-green-400',
      strategy: 'RSI Reversal',
      status: 'Closed',
    },
    {
      id: '14',
      timestamp: '2024-01-13 16:40:15',
      market: 'SOL > $200',
      asset: 'SOL',
      side: 'Buy Yes',
      sideColor: 'text-green-400',
      shares: 160,
      costPerShare: '35¢',
      totalCost: '$56.00',
      exitPrice: '33¢',
      exitShares: 160,
      exitTotal: '$52.80',
      pnl: '-$3.20',
      pnlColor: 'text-red-400',
      strategy: 'MACD Crossover',
      status: 'Closed',
    },
    // Additional trades for 42¢ price point
    {
      id: '15',
      timestamp: '2024-01-13 15:55:22',
      market: 'XRP > $2',
      asset: 'XRP',
      side: 'Buy Yes',
      sideColor: 'text-green-400',
      shares: 95,
      costPerShare: '42¢',
      totalCost: '$39.90',
      exitPrice: '46¢',
      exitShares: 95,
      exitTotal: '$43.70',
      pnl: '+$3.80',
      pnlColor: 'text-green-400',
      strategy: 'Bollinger Squeeze',
      status: 'Closed',
    },
    {
      id: '16',
      timestamp: '2024-01-13 14:20:08',
      market: 'BTC > $100k',
      asset: 'BTC',
      side: 'Buy Yes',
      sideColor: 'text-green-400',
      shares: 110,
      costPerShare: '42¢',
      totalCost: '$46.20',
      exitPrice: '40¢',
      exitShares: 110,
      exitTotal: '$44.00',
      pnl: '-$2.20',
      pnlColor: 'text-red-400',
      strategy: 'Mean Reversion',
      status: 'Closed',
    },
    // Additional trades for 40¢ price point
    {
      id: '17',
      timestamp: '2024-01-13 13:05:45',
      market: 'ETH > $5k',
      asset: 'ETH',
      side: 'Buy Yes',
      sideColor: 'text-green-400',
      shares: 130,
      costPerShare: '40¢',
      totalCost: '$52.00',
      exitPrice: '45¢',
      exitShares: 130,
      exitTotal: '$58.50',
      pnl: '+$6.50',
      pnlColor: 'text-green-400',
      strategy: 'Momentum Breakout',
      status: 'Closed',
    },
    {
      id: '18',
      timestamp: '2024-01-13 12:30:19',
      market: 'SOL > $200',
      asset: 'SOL',
      side: 'Buy Yes',
      sideColor: 'text-green-400',
      shares: 85,
      costPerShare: '40¢',
      totalCost: '$34.00',
      pnl: '+$4.25',
      pnlColor: 'text-green-400',
      strategy: 'RSI Reversal',
      status: 'Open',
    },
    // Additional trades for 31¢ price point
    {
      id: '19',
      timestamp: '2024-01-12 18:15:30',
      market: 'XRP > $2',
      asset: 'XRP',
      side: 'Sell No',
      sideColor: 'text-red-400',
      shares: 220,
      costPerShare: '31¢',
      totalCost: '$68.20',
      exitPrice: '29¢',
      exitShares: 220,
      exitTotal: '$63.80',
      pnl: '+$4.40',
      pnlColor: 'text-green-400',
      strategy: 'MACD Crossover',
      status: 'Closed',
    },
    {
      id: '20',
      timestamp: '2024-01-12 17:00:12',
      market: 'BTC > $100k',
      asset: 'BTC',
      side: 'Sell No',
      sideColor: 'text-red-400',
      shares: 150,
      costPerShare: '31¢',
      totalCost: '$46.50',
      exitPrice: '33¢',
      exitShares: 150,
      exitTotal: '$49.50',
      pnl: '-$3.00',
      pnlColor: 'text-red-400',
      strategy: 'Bollinger Squeeze',
      status: 'Closed',
    },
  ]

  const handleTradeClick = (trade: Trade) => {
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

  // Get trades for selected price point
  const getTradesForPricePoint = (price: number): Trade[] => {
    return trades.filter((trade) => {
      const priceMatch = trade.costPerShare.match(/(\d+)¢/)
      if (priceMatch) {
        return parseInt(priceMatch[1]) === price
      }
      return false
    })
  }

  // Get strategies that use this price point
  const getStrategiesForPricePoint = (price: number): string[] => {
    const priceTrades = getTradesForPricePoint(price)
    const uniqueStrategies = new Set(priceTrades.map((trade) => trade.strategy))
    return Array.from(uniqueStrategies)
  }

  // Deterministic pseudo-random function using price as seed
  const seededRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000
    return x - Math.floor(x)
  }

  // Calculate win rate statistics for each price point (1c-99c)
  // Memoized to prevent recalculation on every render
  const pricePointStats = useMemo(() => {
    const stats: Record<number, { total: number; wins: number; losses: number }> = {}

    // Initialize all price points
    for (let i = 1; i <= 99; i++) {
      stats[i] = { total: 0, wins: 0, losses: 0 }
    }

    // Process trades to calculate stats
    trades.forEach((trade) => {
      // Extract price from costPerShare (e.g., "45¢" -> 45)
      const priceMatch = trade.costPerShare.match(/(\d+)¢/)
      if (priceMatch) {
        const price = parseInt(priceMatch[1])
        if (price >= 1 && price <= 99) {
          stats[price].total++
          // Determine if it's a win or loss based on PnL
          const pnlMatch = trade.pnl.match(/[+-]?\$?([\d.]+)/)
          if (pnlMatch) {
            const pnl = parseFloat(pnlMatch[1])
            if (pnl > 0) {
              stats[price].wins++
            } else if (pnl < 0) {
              stats[price].losses++
            }
          }
        }
      }
    })

    // Generate deterministic mock data for price points with no trades (for visualization)
    // Uses price as seed so same price always gets same data
    for (let i = 1; i <= 99; i++) {
      if (stats[i].total === 0) {
        // Use deterministic random based on price
        const rand1 = seededRandom(i)
        const rand2 = seededRandom(i * 2)
        const rand3 = seededRandom(i * 3)
        
        // Add some mock data for better visualization (30% chance, deterministic)
        const mockTrades = rand1 < 0.3 ? Math.floor(rand2 * 10) : 0
        if (mockTrades > 0) {
          stats[i].total = mockTrades
          // Higher win rates for mid-range prices (30-70c)
          const baseWinRate = i >= 30 && i <= 70 ? 0.65 : 0.55
          const winRateVariation = (rand3 - 0.5) * 0.2
          stats[i].wins = Math.floor(mockTrades * (baseWinRate + winRateVariation))
          stats[i].losses = mockTrades - stats[i].wins
        }
      }
    }

    // Convert to array and calculate win rates
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
  }, [trades])

  // Get color for win rate (heatmap style)
  const getWinRateColor = (winRate: number, totalTrades: number) => {
    if (totalTrades === 0) {
      return 'bg-gray-900 border-gray-800'
    }
    // Green gradient for high win rates, red for low
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

  // Get text color based on background
  const getTextColor = (winRate: number, totalTrades: number) => {
    if (totalTrades === 0) {
      return 'text-gray-600'
    }
    if (winRate >= 50) {
      return 'text-white'
    } else {
      return 'text-white'
    }
  }

  return (
    <div className="bg-black text-white min-h-screen">
      <div className="px-4 sm:px-6 py-6 sm:py-8">
        {/* Header with Strategy Selector */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold">Analytics</h1>
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-400">Strategy:</label>
              <CustomDropdown
                value={selectedStrategy}
                onChange={(value) => setSelectedStrategy(value)}
                options={strategies.map((strategy) => ({
                  value: strategy,
                  label: strategy,
                }))}
                placeholder="Select strategy"
                className="w-48"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-800">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-3 text-sm font-semibold transition-colors relative ${
                activeTab === 'overview'
                  ? 'text-white'
                  : 'text-gray-400 hover:text-white'
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
                activeTab === 'trades'
                  ? 'text-white'
                  : 'text-gray-400 hover:text-white'
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
                activeTab === 'performance'
                  ? 'text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Performance
              {activeTab === 'performance' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-primary" />
              )}
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics Grid */}
            <div>
              <h2 className="text-lg font-semibold mb-4 text-gray-300">
                Averages over past 50 trades
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
                  <div className="text-xs text-gray-400 mb-1">Total Trades</div>
                  <div className="text-white font-bold text-2xl">{analyticsData.totalTrades}</div>
                  <div className="text-xs text-gray-500 mt-1">All-time</div>
                </div>

                <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
                  <div className="text-xs text-gray-400 mb-1">Win Rate</div>
                  <div className="text-green-400 font-bold text-2xl">
                    {analyticsData.winRate}%
                  </div>
                </div>

                <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
                  <div className="text-xs text-gray-400 mb-1">Total PnL</div>
                  <div className="text-green-400 font-bold text-2xl">
                    +${analyticsData.totalPnL.toFixed(2)}
                  </div>
                </div>

                <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
                  <div className="text-xs text-gray-400 mb-1">Avg Trade Cost</div>
                  <div className="text-white font-bold text-2xl">
                    ${analyticsData.avgTradeCost.toFixed(2)}
                  </div>
                </div>

                <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
                  <div className="text-xs text-gray-400 mb-1">Avg Cost/Share</div>
                  <div className="text-white font-bold text-2xl">
                    {analyticsData.avgCostPerShare.toFixed(2)}¢
                  </div>
                </div>

                <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
                  <div className="text-xs text-gray-400 mb-1">Avg Frequency</div>
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
                    {analyticsData.wlRatio.toFixed(2)}
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
              </div>
            </div>
          </div>
        )}

        {activeTab === 'trades' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-300">Trade History</h2>
              <div className="text-sm text-gray-400">
                Click any trade for detailed analysis
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-gray-400 border-b border-gray-800">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium">Time</th>
                    <th className="text-left py-3 px-4 font-medium">Market</th>
                    <th className="text-left py-3 px-4 font-medium">Side</th>
                    <th className="text-left py-3 px-4 font-medium">Strategy</th>
                    <th className="text-right py-3 px-4 font-medium">Shares</th>
                    <th className="text-right py-3 px-4 font-medium">Cost/Share</th>
                    <th className="text-right py-3 px-4 font-medium">Total Cost</th>
                    <th className="text-right py-3 px-4 font-medium">Exit Price</th>
                    <th className="text-right py-3 px-4 font-medium">PnL</th>
                    <th className="text-right py-3 px-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((trade) => (
                    <>
                      <tr
                        key={trade.id}
                        onClick={() => handleTradeClick(trade)}
                        className="border-b border-gray-800 hover:bg-gray-900/30 cursor-pointer"
                      >
                        <td className="py-3 px-4 text-gray-400">{trade.timestamp}</td>
                        <td className="py-3 px-4 text-white">{trade.market}</td>
                        <td className="py-3 px-4">
                          <span className={trade.sideColor}>{trade.side}</span>
                        </td>
                        <td className="py-3 px-4 text-gray-400 text-xs">
                          {trade.strategy}
                        </td>
                        <td className="py-3 px-4 text-right text-white">{trade.shares}</td>
                        <td className="py-3 px-4 text-right text-white">
                          {trade.costPerShare}
                        </td>
                        <td className="py-3 px-4 text-right text-white">
                          {trade.totalCost}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-400">
                          {trade.exitPrice || '-'}
                        </td>
                        <td className={`py-3 px-4 text-right ${trade.pnlColor}`}>
                          {trade.pnl}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              trade.status === 'Open'
                                ? 'bg-green-900/30 text-green-400'
                                : 'bg-gray-800 text-gray-400'
                            }`}
                          >
                            {trade.status}
                          </span>
                        </td>
                      </tr>
                      {expandedTrade === trade.id && selectedTrade && (
                        <tr className="bg-gray-900/50">
                          <td colSpan={10} className="px-4 py-6">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-white">
                                  Trade Details
                                </h3>
                                <button
                                  onClick={closeTradeDetail}
                                  className="text-gray-400 hover:text-white transition-colors"
                                >
                                  <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M6 18L18 6M6 6l12 12"
                                    />
                                  </svg>
                                </button>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div className="bg-black/50 rounded-lg p-3 border border-gray-800">
                                  <div className="text-xs text-gray-400 mb-1">Entry Details</div>
                                  <div className="text-white text-sm">
                                    <div>Shares: {selectedTrade.shares}</div>
                                    <div>Cost/Share: {selectedTrade.costPerShare}</div>
                                    <div>Total: {selectedTrade.totalCost}</div>
                                  </div>
                                </div>

                                {selectedTrade.exitPrice && (
                                  <div className="bg-black/50 rounded-lg p-3 border border-gray-800">
                                    <div className="text-xs text-gray-400 mb-1">Exit Details</div>
                                    <div className="text-white text-sm">
                                      <div>Shares: {selectedTrade.exitShares}</div>
                                      <div>Exit Price: {selectedTrade.exitPrice}</div>
                                      <div>Total: {selectedTrade.exitTotal}</div>
                                    </div>
                                  </div>
                                )}

                                <div className="bg-black/50 rounded-lg p-3 border border-gray-800">
                                  <div className="text-xs text-gray-400 mb-1">Trade Info</div>
                                  <div className="text-white text-sm">
                                    <div>Market: {selectedTrade.market}</div>
                                    <div>Asset: {selectedTrade.asset}</div>
                                    <div>Strategy: {selectedTrade.strategy}</div>
                                  </div>
                                </div>

                                <div className="bg-black/50 rounded-lg p-3 border border-gray-800">
                                  <div className="text-xs text-gray-400 mb-1">Performance</div>
                                  <div className="text-sm">
                                    <div className={selectedTrade.pnlColor}>
                                      PnL: {selectedTrade.pnl}
                                    </div>
                                    <div className="text-gray-400 mt-1">
                                      Status: {selectedTrade.status}
                                    </div>
                                    <div className="text-gray-400 text-xs mt-1">
                                      {selectedTrade.timestamp}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Additional Analysis Section */}
                              <div className="mt-4 pt-4 border-t border-gray-800">
                                <h4 className="text-sm font-semibold text-gray-300 mb-3">
                                  Trade Analysis
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                  <div className="bg-black/50 rounded-lg p-3 border border-gray-800">
                                    <div className="text-xs text-gray-400 mb-1">
                                      Cost Breakdown
                                    </div>
                                    <div className="text-white text-sm space-y-1">
                                      <div>
                                        Entry: {selectedTrade.shares} shares ×{' '}
                                        {selectedTrade.costPerShare} = {selectedTrade.totalCost}
                                      </div>
                                      {selectedTrade.exitPrice && (
                                        <div>
                                          Exit: {selectedTrade.exitShares} shares ×{' '}
                                          {selectedTrade.exitPrice} = {selectedTrade.exitTotal}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="bg-black/50 rounded-lg p-3 border border-gray-800">
                                    <div className="text-xs text-gray-400 mb-1">
                                      Price Movement
                                    </div>
                                    <div className="text-white text-sm space-y-1">
                                      {selectedTrade.exitPrice ? (
                                        <>
                                          <div>
                                            Entry: {selectedTrade.costPerShare}
                                          </div>
                                          <div>Exit: {selectedTrade.exitPrice}</div>
                                          <div className={selectedTrade.pnlColor}>
                                            {selectedTrade.pnl}
                                          </div>
                                        </>
                                      ) : (
                                        <div className="text-gray-500">Position Open</div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="bg-black/50 rounded-lg p-3 border border-gray-800">
                                    <div className="text-xs text-gray-400 mb-1">
                                      Strategy Performance
                                    </div>
                                    <div className="text-white text-sm space-y-1">
                                      <div>Strategy: {selectedTrade.strategy}</div>
                                      <div className={selectedTrade.pnlColor}>
                                        Result: {selectedTrade.pnl}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="space-y-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-300 mb-2">
                Win Rate by Price Per Share Paid
              </h2>
              <p className="text-sm text-gray-400 mb-2">
                Each cell shows the win rate for trades where you paid that specific price per share
                (1¢ - 99¢). Color indicates win rate performance.
              </p>
              <div className="text-xs text-gray-500 bg-gray-900/50 rounded p-2 inline-block">
                <strong>X-axis (top):</strong> Ones digit of price (0-9) |{' '}
                <strong>Y-axis (left):</strong> Tens digit of price (0-9) |{' '}
                <strong>Cell color:</strong> Win rate |{' '}
                <strong>Cell value:</strong> Win rate % and total trades
              </div>
            </div>

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

            {/* Calendar Grid */}
            <div className="bg-gray-900/50 rounded-lg p-4 sm:p-6 border border-gray-800">
              <div className="space-y-1 sm:space-y-2">
                {/* Price grid rows (0-9, 10-19, etc.) */}
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((tens) => (
                  <div key={tens} className="grid grid-cols-10 gap-1 sm:gap-2">
                    {/* Cells for this row */}
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
                          onClick={() => handlePricePointClick(price)}
                        >
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-1">
                            {/* Show price in corner for clarity */}
                            <div className="absolute top-0.5 left-0.5 text-[8px] text-gray-400 opacity-60">
                              {price}¢
                            </div>
                            <div
                              className={`text-[10px] sm:text-xs font-semibold ${getTextColor(
                                stat.winRate,
                                stat.totalTrades
                              )}`}
                            >
                              {stat.totalTrades > 0
                                ? `${stat.winRate.toFixed(0)}%`
                                : ''}
                            </div>
                            {stat.totalTrades > 0 && (
                              <div
                                className={`text-[8px] sm:text-[10px] ${getTextColor(
                                  stat.winRate,
                                  stat.totalTrades
                                )} opacity-70`}
                              >
                                {stat.totalTrades} trades
                              </div>
                            )}
                          </div>

                          {/* Tooltip on hover */}
                          {hoveredPrice === price && (
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-xl z-20 min-w-[200px]">
                              <div className="text-sm font-semibold text-white mb-2">
                                Price Per Share: {price}¢
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
                                    <span className="text-gray-400">Total Trades:</span>
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
                                  <div className="mt-2 pt-2 border-t border-gray-700">
                                    <div className="text-gray-400 text-[10px]">
                                      Risk/Reward: {stat.winRate >= 50 ? '✅ Favorable' : '⚠️ Unfavorable'} at this price point
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-xs text-gray-400">
                                  No trades at this price point
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
                    <div className="text-white font-semibold text-sm">45-55¢</div>
                    <div className="text-xs text-gray-500 mt-1">Avg: 72% WR</div>
                  </div>
                  <div className="bg-black/50 rounded-lg p-3 border border-gray-800">
                    <div className="text-xs text-gray-400 mb-1">Most Traded</div>
                    <div className="text-white font-semibold text-sm">38-42¢</div>
                    <div className="text-xs text-gray-500 mt-1">247 trades</div>
                  </div>
                  <div className="bg-black/50 rounded-lg p-3 border border-gray-800">
                    <div className="text-xs text-gray-400 mb-1">Worst Price Range</div>
                    <div className="text-white font-semibold text-sm">10-20¢</div>
                    <div className="text-xs text-gray-500 mt-1">Avg: 45% WR</div>
                  </div>
                  <div className="bg-black/50 rounded-lg p-3 border border-gray-800">
                    <div className="text-xs text-gray-400 mb-1">Price Points Used</div>
                    <div className="text-white font-semibold text-sm">
                      {pricePointStats.filter((s) => s.totalTrades > 0).length}/99
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Active ranges</div>
                  </div>
                </div>
              </div>
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
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-black">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Price Point: {selectedPricePoint}¢
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  Detailed analysis for trades purchased at this price per share
                </p>
              </div>
              <button
                onClick={closePricePointModal}
                className="text-gray-400 hover:text-white transition-colors p-2"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-black">
              {(() => {
                const priceTrades = getTradesForPricePoint(selectedPricePoint)
                const priceStrategies = getStrategiesForPricePoint(selectedPricePoint)
                const priceStat = pricePointStats.find(
                  (s) => s.price === selectedPricePoint
                ) || {
                  price: selectedPricePoint,
                  totalTrades: 0,
                  wins: 0,
                  losses: 0,
                  winRate: 0,
                }

                return (
                  <div className="space-y-6">
                    {/* Statistics Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-black/50 rounded-lg p-4 border border-gray-800">
                        <div className="text-xs text-gray-400 mb-1">Total Trades</div>
                        <div className="text-white font-bold text-2xl">
                          {priceStat.totalTrades}
                        </div>
                      </div>
                      <div className="bg-black/50 rounded-lg p-4 border border-gray-800">
                        <div className="text-xs text-gray-400 mb-1">Win Rate</div>
                        <div className="text-green-400 font-bold text-2xl">
                          {priceStat.winRate.toFixed(1)}%
                        </div>
                      </div>
                      <div className="bg-black/50 rounded-lg p-4 border border-gray-800">
                        <div className="text-xs text-gray-400 mb-1">Wins</div>
                        <div className="text-green-400 font-bold text-2xl">
                          {priceStat.wins}
                        </div>
                      </div>
                      <div className="bg-black/50 rounded-lg p-4 border border-gray-800">
                        <div className="text-xs text-gray-400 mb-1">Losses</div>
                        <div className="text-red-400 font-bold text-2xl">
                          {priceStat.losses}
                        </div>
                      </div>
                    </div>

                    {/* Strategies Using This Price Point */}
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">
                        Strategies Using {selectedPricePoint}¢
                      </h3>
                      {priceStrategies.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {priceStrategies.map((strategy) => (
                            <div
                              key={strategy}
                              className="bg-purple-primary/20 border border-purple-primary/50 rounded-lg px-4 py-2"
                            >
                              <span className="text-purple-primary font-medium text-sm">
                                {strategy}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-black/50 rounded-lg p-4 border border-gray-800">
                          <p className="text-gray-400 text-sm">
                            No active strategies currently use this price point
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Trading History */}
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">
                        Trading History
                      </h3>
                      {priceTrades.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="text-gray-400 border-b border-gray-800">
                              <tr>
                                <th className="text-left py-3 px-4 font-medium">Time</th>
                                <th className="text-left py-3 px-4 font-medium">Market</th>
                                <th className="text-left py-3 px-4 font-medium">Side</th>
                                <th className="text-left py-3 px-4 font-medium">Strategy</th>
                                <th className="text-right py-3 px-4 font-medium">Shares</th>
                                <th className="text-right py-3 px-4 font-medium">Exit Price</th>
                                <th className="text-right py-3 px-4 font-medium">PnL</th>
                                <th className="text-right py-3 px-4 font-medium">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {priceTrades.map((trade) => (
                                <tr
                                  key={trade.id}
                                  className="border-b border-gray-800 hover:bg-gray-900/30"
                                >
                                  <td className="py-3 px-4 text-gray-400">
                                    {trade.timestamp}
                                  </td>
                                  <td className="py-3 px-4 text-white">{trade.market}</td>
                                  <td className="py-3 px-4">
                                    <span className={trade.sideColor}>{trade.side}</span>
                                  </td>
                                  <td className="py-3 px-4 text-gray-400 text-xs">
                                    {trade.strategy}
                                  </td>
                                  <td className="py-3 px-4 text-right text-white">
                                    {trade.shares}
                                  </td>
                                  <td className="py-3 px-4 text-right text-gray-400">
                                    {trade.exitPrice || '-'}
                                  </td>
                                  <td className={`py-3 px-4 text-right ${trade.pnlColor}`}>
                                    {trade.pnl}
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <span
                                      className={`text-xs px-2 py-1 rounded ${
                                        trade.status === 'Open'
                                          ? 'bg-green-900/30 text-green-400'
                                          : 'bg-gray-800 text-gray-400'
                                      }`}
                                    >
                                      {trade.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="bg-black/50 rounded-lg p-4 border border-gray-800">
                          <p className="text-gray-400 text-sm text-center">
                            No trades found at this price point
                          </p>
                        </div>
                      )}
                    </div>
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
