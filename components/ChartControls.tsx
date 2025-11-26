'use client'

import { useTradingContext } from '@/contexts/TradingContext'

const ChartControls = () => {
  const { selectedTimeframe, selectedPair, showTradingView, setSelectedTimeframe, setSelectedPair, setShowTradingView } =
    useTradingContext()

  const timeframes = ['15m', '1h']
  const pairs = ['BTC', 'SOL', 'ETH', 'XRP']

  return (
    <div className="bg-black border-b border-gray-800 px-2 sm:px-4 py-2 sm:py-3">
      <div className="flex items-center justify-between">
        {/* Timeframes and Pair Selector */}
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            {timeframes.map((tf) => (
              <button
                key={tf}
                onClick={() => setSelectedTimeframe(tf)}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium rounded transition-colors ${
                  selectedTimeframe === tf
                    ? 'bg-purple-primary text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-gray-800 hidden sm:block" />

          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            {pairs.map((pair) => (
              <button
                key={pair}
                onClick={() => setSelectedPair(pair)}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium rounded transition-colors ${
                  selectedPair === pair
                    ? 'bg-purple-primary text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {pair}
              </button>
            ))}
          </div>
        </div>

        {/* TradingView Chart Button */}
        <div className="flex items-center">
          <button
            onClick={() => setShowTradingView(!showTradingView)}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded transition-colors flex items-center gap-2 ${
              showTradingView
                ? 'bg-purple-primary text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
            aria-label="TradingView Chart"
            title="TradingView Chart"
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
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <span className="hidden sm:inline">TradingView</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChartControls

