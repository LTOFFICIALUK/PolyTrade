'use client'

interface StrategyAnalyticsProps {
  selectedStrategy: string | null
}

const StrategyAnalytics = ({ selectedStrategy }: StrategyAnalyticsProps) => {
  if (!selectedStrategy) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-400 text-sm">Select a strategy to view analytics</p>
      </div>
    )
  }

  // Mock analytics data - would come from API
  const analyticsData = {
    totalTrades: 47,
    winRate: 68.1,
    totalPnL: 123.8,
    avgTradeSize: 0.15,
    bestTrade: 12.5,
    worstTrade: -4.2,
    sharpeRatio: 1.85,
    maxDrawdown: -8.3,
    profitFactor: 2.1,
  }

  return (
    <div className="p-4 space-y-4">
      <div className="mb-4">
        <h3 className="text-white font-semibold text-sm mb-1">{selectedStrategy}</h3>
        <p className="text-gray-400 text-xs">Strategy Performance</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-900/50 rounded p-3 border border-gray-800">
          <div className="text-xs text-gray-400 mb-1">Total Trades</div>
          <div className="text-white font-bold text-lg">{analyticsData.totalTrades}</div>
        </div>

        <div className="bg-gray-900/50 rounded p-3 border border-gray-800">
          <div className="text-xs text-gray-400 mb-1">Win Rate</div>
          <div className="text-green-400 font-bold text-lg">{analyticsData.winRate}%</div>
        </div>

        <div className="bg-gray-900/50 rounded p-3 border border-gray-800">
          <div className="text-xs text-gray-400 mb-1">Total PnL</div>
          <div className="text-green-400 font-bold text-lg">+${analyticsData.totalPnL}</div>
        </div>

        <div className="bg-gray-900/50 rounded p-3 border border-gray-800">
          <div className="text-xs text-gray-400 mb-1">Avg Trade</div>
          <div className="text-white font-bold text-lg">${analyticsData.avgTradeSize}</div>
        </div>

        <div className="bg-gray-900/50 rounded p-3 border border-gray-800">
          <div className="text-xs text-gray-400 mb-1">Best Trade</div>
          <div className="text-green-400 font-bold text-lg">+${analyticsData.bestTrade}</div>
        </div>

        <div className="bg-gray-900/50 rounded p-3 border border-gray-800">
          <div className="text-xs text-gray-400 mb-1">Worst Trade</div>
          <div className="text-red-400 font-bold text-lg">${analyticsData.worstTrade}</div>
        </div>

        <div className="bg-gray-900/50 rounded p-3 border border-gray-800">
          <div className="text-xs text-gray-400 mb-1">Sharpe Ratio</div>
          <div className="text-white font-bold text-lg">{analyticsData.sharpeRatio}</div>
        </div>

        <div className="bg-gray-900/50 rounded p-3 border border-gray-800">
          <div className="text-xs text-gray-400 mb-1">Max Drawdown</div>
          <div className="text-red-400 font-bold text-lg">{analyticsData.maxDrawdown}%</div>
        </div>
      </div>

      <div className="bg-gray-900/50 rounded p-3 border border-gray-800">
        <div className="text-xs text-gray-400 mb-1">Profit Factor</div>
        <div className="text-white font-bold text-lg">{analyticsData.profitFactor}</div>
      </div>
    </div>
  )
}

export default StrategyAnalytics

