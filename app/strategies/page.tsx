'use client'

import { useState, KeyboardEvent, MouseEvent } from 'react'
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
    router.push('/strategies/new')
  }

  const handleCreateKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return
    }

    event.preventDefault()
    handleCreateNew()
  }

  const handleDelete = (id: string, event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    // TODO: Implement delete strategy functionality
    console.log('Delete strategy:', id)
  }

  const handleClone = (id: string, event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    // TODO: Implement clone strategy functionality
    console.log('Clone strategy:', id)
  }

  const handleEdit = (id: string, event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    // TODO: Implement edit strategy functionality
    console.log('Edit strategy:', id)
  }

  const sortedStrategies = [...strategies].sort((a, b) => {
    if (a.isActive === b.isActive) return 0
    return a.isActive ? -1 : 1
  })

  return (
    <div className="bg-black text-white min-h-screen">
      <div className="px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold">Strategies</h1>
          <button
            type="button"
            tabIndex={0}
            aria-label="Create new strategy"
            onClick={handleCreateNew}
            onKeyDown={handleCreateKeyDown}
            className="w-full sm:w-auto rounded bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white transition-colors duration-200 hover:bg-blue-700 focus:outline-none"
          >
            New strategy
          </button>
        </div>

        {sortedStrategies.length === 0 ? (
          <div className="py-16 text-center">
            <h2 className="text-base font-medium text-gray-400 mb-1">No Strategies</h2>
            <p className="text-sm text-gray-500 mb-6">
              Create your first trading strategy to get started.
            </p>
            <button
              type="button"
              onClick={handleCreateNew}
              className="inline-block px-6 py-2.5 bg-purple-primary hover:bg-purple-hover text-white rounded-lg text-sm font-medium transition-colors"
            >
              Create Strategy
            </button>
          </div>
        ) : (
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
                  <th className="text-right py-3 px-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedStrategies.map((strategy) => (
                <tr
                  key={strategy.id}
                  onClick={() => handleStrategyClick(strategy.id)}
                  className={`border-b border-gray-800 hover:bg-gray-900/30 cursor-pointer ${
                    !strategy.isActive ? 'opacity-70' : ''
                  }`}
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
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => handleEdit(strategy.id, e)}
                            className="p-1.5 text-gray-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-purple-primary focus:ring-offset-2 focus:ring-offset-black rounded"
                            aria-label={`Edit ${strategy.name}`}
                            tabIndex={0}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => handleClone(strategy.id, e)}
                            className="p-1.5 text-gray-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-purple-primary focus:ring-offset-2 focus:ring-offset-black rounded"
                            aria-label={`Clone ${strategy.name}`}
                            tabIndex={0}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => handleDelete(strategy.id, e)}
                            className="p-1.5 text-gray-400 hover:text-red-400 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-primary focus:ring-offset-2 focus:ring-offset-black rounded"
                            aria-label={`Delete ${strategy.name}`}
                            tabIndex={0}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
