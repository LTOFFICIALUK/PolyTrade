'use client'

import { useState, useMemo } from 'react'

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

export default function HistoryPage() {
  const [outcomesOnly, setOutcomesOnly] = useState(false)

  // Mock trades data - same as analytics page
  const allTrades: Trade[] = [
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

  // Filter trades based on outcomesOnly toggle
  const filteredTrades = useMemo(() => {
    if (outcomesOnly) {
      // Show only trades that have an outcome (Closed with Win/Loss, or Open/In Progress)
      // This filters out intermediate buy/sell actions and shows only final outcomes
      return allTrades.filter((trade) => trade.status === 'Closed' || trade.status === 'Open')
    }
    return allTrades
  }, [outcomesOnly])

  return (
    <div className="bg-black text-white min-h-screen">
      <div className="px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">Trading History</h1>
          <button
            onClick={() => setOutcomesOnly(!outcomesOnly)}
            className={`px-4 py-2 rounded transition-colors text-sm font-medium ${
              outcomesOnly
                ? 'bg-purple-primary text-white'
                : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'
            }`}
          >
            {outcomesOnly ? '✓ Outcomes Only' : 'Outcomes Only'}
          </button>
        </div>

        {/* Description */}
        <div className="mb-6">
          <p className="text-sm text-gray-400">
            {outcomesOnly
              ? 'Showing only trade outcomes (Win/Lost/In Progress)'
              : 'Showing all trades including buy and sell actions'}
          </p>
        </div>

        {/* Trades Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-gray-400 border-b border-gray-800">
              <tr>
                <th className="text-left py-3 px-4 font-medium">Time</th>
                <th className="text-left py-3 px-4 font-medium">Market</th>
                <th className="text-left py-3 px-4 font-medium">Side</th>
                <th className="text-left py-3 px-4 font-medium">Strategy</th>
                <th className="text-right py-3 px-4 font-medium">Shares</th>
                <th className="text-right py-3 px-4 font-medium">Entry Price</th>
                <th className="text-right py-3 px-4 font-medium">Exit Price</th>
                <th className="text-right py-3 px-4 font-medium">PnL</th>
                <th className="text-right py-3 px-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrades.length > 0 ? (
                filteredTrades.map((trade) => (
                  <tr
                    key={trade.id}
                    className="border-b border-gray-800 hover:bg-gray-900/30"
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
                            : trade.pnlColor === 'text-green-400'
                            ? 'bg-green-900/30 text-green-400'
                            : 'bg-red-900/30 text-red-400'
                        }`}
                      >
                        {trade.status === 'Open'
                          ? 'In Progress'
                          : trade.pnlColor === 'text-green-400'
                          ? 'Win'
                          : 'Lost'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 px-4 text-center text-gray-500 text-sm">
                    No trades found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

