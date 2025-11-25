'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Strategy {
  id: string
  name: string
  type: string
  isActive: boolean
  pnl: string
  pnlColor: string
  totalTrades: number
  winRate: string
  lastUpdated: string
}

export default function StrategiesPage() {
  const router = useRouter()
  const [strategies, setStrategies] = useState<Strategy[]>([
    {
      id: '1',
      name: 'Momentum Breakout',
      type: 'Technical',
      isActive: true,
      pnl: '+$125.50',
      pnlColor: 'text-green-400',
      totalTrades: 45,
      winRate: '68%',
      lastUpdated: '2 min ago',
    },
    {
      id: '2',
      name: 'RSI Reversal',
      type: 'Technical',
      isActive: true,
      pnl: '+$89.20',
      pnlColor: 'text-green-400',
      totalTrades: 32,
      winRate: '72%',
      lastUpdated: '5 min ago',
    },
    {
      id: '3',
      name: 'MACD Crossover',
      type: 'Technical',
      isActive: true,
      pnl: '+$156.80',
      pnlColor: 'text-green-400',
      totalTrades: 58,
      winRate: '65%',
      lastUpdated: '1 min ago',
    },
    {
      id: '4',
      name: 'Bollinger Squeeze',
      type: 'Technical',
      isActive: true,
      pnl: '-$23.40',
      pnlColor: 'text-red-400',
      totalTrades: 28,
      winRate: '54%',
      lastUpdated: '8 min ago',
    },
    {
      id: '5',
      name: 'Volume Surge',
      type: 'Technical',
      isActive: false,
      pnl: '+$45.60',
      pnlColor: 'text-green-400',
      totalTrades: 19,
      winRate: '63%',
      lastUpdated: '2 hours ago',
    },
    {
      id: '6',
      name: 'Mean Reversion',
      type: 'Statistical',
      isActive: false,
      pnl: '+$12.30',
      pnlColor: 'text-green-400',
      totalTrades: 15,
      winRate: '60%',
      lastUpdated: '1 day ago',
    },
    {
      id: '7',
      name: 'Support/Resistance',
      type: 'Technical',
      isActive: false,
      pnl: '-$8.90',
      pnlColor: 'text-red-400',
      totalTrades: 22,
      winRate: '55%',
      lastUpdated: '3 days ago',
    },
  ])

  const toggleStrategy = (id: string) => {
    setStrategies((prev) =>
      prev.map((strategy) =>
        strategy.id === id
          ? { ...strategy, isActive: !strategy.isActive }
          : strategy
      )
    )
  }

  const handleStrategyClick = (id: string) => {
    router.push(`/strategies/${id}`)
  }

  const handleCreateNew = () => {
    // TODO: Implement create new strategy functionality
    console.log('Create new strategy')
  }

  const activeStrategies = strategies.filter((s) => s.isActive)
  const inactiveStrategies = strategies.filter((s) => !s.isActive)

  return (
    <div className="bg-black text-white min-h-screen">
      <div className="px-4 sm:px-6 py-6 sm:py-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Strategies</h1>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-gray-400 border-b border-gray-800">
              <tr>
                <th className="text-left py-3 px-4 font-medium w-16">Status</th>
                <th className="text-left py-3 px-4 font-medium">Strategy Name</th>
                <th className="text-left py-3 px-4 font-medium">Type</th>
                <th className="text-right py-3 px-4 font-medium">PnL</th>
                <th className="text-right py-3 px-4 font-medium">Total Trades</th>
                <th className="text-right py-3 px-4 font-medium">Win Rate</th>
                <th className="text-right py-3 px-4 font-medium">Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {/* Active Strategies */}
              {activeStrategies.map((strategy) => (
                <tr
                  key={strategy.id}
                  onClick={() => handleStrategyClick(strategy.id)}
                  className="border-b border-gray-800 hover:bg-gray-900/30 cursor-pointer"
                >
                  <td className="py-3 px-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleStrategy(strategy.id)
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-primary focus:ring-offset-2 focus:ring-offset-black ${
                        strategy.isActive ? 'bg-purple-primary' : 'bg-gray-600'
                      }`}
                      aria-label={`Toggle ${strategy.name}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          strategy.isActive ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="py-3 px-4 text-white font-medium">{strategy.name}</td>
                  <td className="py-3 px-4 text-gray-400">{strategy.type}</td>
                  <td className={`py-3 px-4 text-right ${strategy.pnlColor}`}>
                    {strategy.pnl}
                  </td>
                  <td className="py-3 px-4 text-right text-white">
                    {strategy.totalTrades}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-400">
                    {strategy.winRate}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-400">
                    {strategy.lastUpdated}
                  </td>
                </tr>
              ))}

              {/* Create New Row - at bottom of active strategies */}
              <tr
                onClick={handleCreateNew}
                className="border-b border-gray-800 hover:bg-gray-900/30 cursor-pointer"
              >
                <td className="py-3 px-4"></td>
                <td className="py-3 px-4 text-purple-primary font-medium">
                  + Create new
                </td>
                <td className="py-3 px-4 text-gray-500">-</td>
                <td className="py-3 px-4 text-right text-gray-500">-</td>
                <td className="py-3 px-4 text-right text-gray-500">-</td>
                <td className="py-3 px-4 text-right text-gray-500">-</td>
                <td className="py-3 px-4 text-right text-gray-500">-</td>
              </tr>

              {/* Breaker Line */}
              {inactiveStrategies.length > 0 && (
                <tr>
                  <td colSpan={7} className="py-2 px-4">
                    <div className="h-px bg-gray-800 w-full" />
                  </td>
                </tr>
              )}

              {/* Inactive Strategies */}
              {inactiveStrategies.map((strategy) => (
                <tr
                  key={strategy.id}
                  onClick={() => handleStrategyClick(strategy.id)}
                  className="border-b border-gray-800 hover:bg-gray-900/30 cursor-pointer opacity-70"
                >
                  <td className="py-3 px-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleStrategy(strategy.id)
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-primary focus:ring-offset-2 focus:ring-offset-black ${
                        strategy.isActive ? 'bg-purple-primary' : 'bg-gray-600'
                      }`}
                      aria-label={`Toggle ${strategy.name}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          strategy.isActive ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="py-3 px-4 text-white font-medium">{strategy.name}</td>
                  <td className="py-3 px-4 text-gray-400">{strategy.type}</td>
                  <td className={`py-3 px-4 text-right ${strategy.pnlColor}`}>
                    {strategy.pnl}
                  </td>
                  <td className="py-3 px-4 text-right text-white">
                    {strategy.totalTrades}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-400">
                    {strategy.winRate}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-400">
                    {strategy.lastUpdated}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
