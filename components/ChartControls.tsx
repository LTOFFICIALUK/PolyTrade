'use client'

import { useTradingContext } from '@/contexts/TradingContext'

const ChartControls = () => {
  const { selectedTimeframe, selectedPair, setSelectedTimeframe, setSelectedPair } =
    useTradingContext()

  const timeframes = ['15m', '1h']
  const pairs = ['BTC', 'SOL', 'ETH', 'XRP']

  return (
    <div className="bg-black border-b border-gray-800 px-2 sm:px-4 py-2 sm:py-3">
      <div className="flex items-center">
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
      </div>
    </div>
  )
}

export default ChartControls

