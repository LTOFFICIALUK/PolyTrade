'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTradingContext } from '@/contexts/TradingContext'
import usePolymarketPrices from '@/hooks/usePolymarketPrices'

interface ChartPoint {
  time: number
  buy: number
  sell: number
}

const POINT_COUNT = 120

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const PolyLineChart = () => {
  const { selectedPair, selectedTimeframe } = useTradingContext()
  // Start with empty data so server & client HTML match and avoid hydration issues
  const [series, setSeries] = useState<ChartPoint[]>([])

  // Live Polymarket prices (probabilities 0–1)
  const { prices } = usePolymarketPrices({
    pair: selectedPair,
    timeframe: selectedTimeframe,
    interval: 1000,
    useWebSocket: false,
  })

  // When live prices update, append a new point and keep last POINT_COUNT samples
  useEffect(() => {
    if (!prices) return

    const buy = clamp(prices.yesPrice * 100, 1, 99)
    const sell = clamp(prices.noPrice * 100, 1, 99)
    const now = Date.now()

    setSeries((prev) => {
      // On first tick, backfill history with same price so chart fills the width
      if (!prev.length) {
        const filled: ChartPoint[] = Array.from({ length: POINT_COUNT }, (_, idx) => ({
          time: now - (POINT_COUNT - 1 - idx) * 1000,
          buy,
          sell,
        }))
        return filled
      }

      const next: ChartPoint = { time: now, buy, sell }
      const updated = [...prev.slice(1), next]
      return updated
    })
  }, [prices?.yesPrice, prices?.noPrice])

  const { buyPath, sellPath, minPrice, maxPrice, paddedMin, paddedMax } = useMemo(() => {
    if (!series.length) {
      return { buyPath: '', sellPath: '', minPrice: 0, maxPrice: 100, paddedMin: 0, paddedMax: 100 }
    }

    const values = series.flatMap((point) => [point.buy, point.sell])
    const rawMin = Math.min(...values)
    const rawMax = Math.max(...values)

    // Always compute scale off both lines together
    const padding = Math.max(0.5, (rawMax - rawMin) * 0.1)
    const minValue = Math.max(0, rawMin - padding)
    const maxValue = Math.min(100, rawMax + padding)
    const range = maxValue - minValue || 1

    const toPath = (key: keyof ChartPoint) =>
      series
        .map((point, idx) => {
          const x = (idx / (series.length - 1)) * 100
          const value = point[key] as number
          // Map values to 10%-90% of height (leaving 10% padding at top/bottom)
          const normalized = 100 - ((value - minValue) / range) * 80 - 10
          return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${normalized.toFixed(2)}`
        })
        .join(' ')

    return {
      buyPath: toPath('buy'),
      sellPath: toPath('sell'),
      minPrice: minValue,
      maxPrice: maxValue,
      paddedMin: minValue,
      paddedMax: maxValue,
    }
  }, [series])

  const latest = series[series.length - 1]
  const spread = latest ? Math.abs(latest.buy - latest.sell) : 0

  return (
    <div className="w-full h-full bg-black text-white relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-10">
        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(#222 1px, transparent 1px)', backgroundSize: '100% 20%' }} />
        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(90deg, #222 1px, transparent 1px)', backgroundSize: '12.5% 100%' }} />
      </div>

      <div className="relative h-full flex flex-col p-4 gap-4">
        <div className="flex items-center justify-between text-xs sm:text-sm">
          <div>
            <p className="text-gray-400 uppercase tracking-widest">Poly Orderbook</p>
            <p className="text-lg font-semibold">{selectedPair} • Live Bid</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-2 text-green-400">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              Buy
            </span>
            <span className="flex items-center gap-2 text-pink-400">
              <span className="w-2 h-2 rounded-full bg-pink-400" />
              Sell
            </span>
          </div>
        </div>

        <div className="flex-1 relative">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
            <defs>
              <linearGradient id="buyLine" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#34d399" stopOpacity="0.05" />
              </linearGradient>
              <linearGradient id="sellLine" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fb7185" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#fb7185" stopOpacity="0.05" />
              </linearGradient>
            </defs>
            <path
              d={buyPath}
              fill="none"
              stroke="url(#buyLine)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#glowBuy)"
            />
            <path
              d={sellPath}
              fill="none"
              stroke="url(#sellLine)"
              strokeWidth="2"
              strokeDasharray="6 3"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#glowSell)"
            />
            <defs>
              <filter id="glowBuy" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#34d399" floodOpacity="0.45" />
              </filter>
              <filter id="glowSell" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#fb7185" floodOpacity="0.45" />
              </filter>
            </defs>
          </svg>

          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between py-6 pl-1 text-[10px] text-gray-500">
            {Array.from({ length: 5 }).map((_, idx) => {
              const value = paddedMax - ((paddedMax - paddedMin) / 4) * idx
              return (
                <div key={idx} className="flex items-center gap-2">
                  <span className="block w-8 text-right font-semibold">{value.toFixed(1)}¢</span>
                  <span className="h-px flex-1 bg-gray-800/60" />
                </div>
              )
            })}
          </div>

          {/* X-axis labels */}
          <div className="absolute left-0 right-0 bottom-0 flex justify-between px-8 pb-2 text-[10px] text-gray-500">
            {Array.from({ length: 4 }).map((_, idx) => {
              const point = series[Math.floor((idx / 3) * (series.length - 1))]
              const timeLabel = point
                ? new Date(point.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : ''
              return (
                <span key={idx} className="font-semibold">
                  {timeLabel}
                </span>
              )
            })}
          </div>

          {latest && (
            <div className="absolute bottom-4 right-4 bg-gray-900/70 border border-gray-800 rounded-xl px-4 py-2 text-xs sm:text-sm">
              <div className="flex items-center justify-between gap-6">
                <div>
                  <p className="text-gray-500 uppercase text-[10px] tracking-widest">BUY</p>
                  <p className="text-green-400 text-lg font-semibold">{latest.buy.toFixed(2)}¢</p>
                </div>
                <div>
                  <p className="text-gray-500 uppercase text-[10px] tracking-widest">SELL</p>
                  <p className="text-pink-400 text-lg font-semibold">{latest.sell.toFixed(2)}¢</p>
                </div>
                <div>
                  <p className="text-gray-500 uppercase text-[10px] tracking-widest">SPREAD</p>
                  <p className="text-white text-lg font-semibold">{spread.toFixed(2)}¢</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="rounded border border-gray-800 bg-gray-900/40 p-3">
            <p className="text-gray-500 uppercase mb-1">High</p>
            <p className="text-white text-lg font-semibold">{maxPrice.toFixed(2)}¢</p>
          </div>
          <div className="rounded border border-gray-800 bg-gray-900/40 p-3">
            <p className="text-gray-500 uppercase mb-1">Low</p>
            <p className="text-white text-lg font-semibold">{minPrice.toFixed(2)}¢</p>
          </div>
          <div className="rounded border border-gray-800 bg-gray-900/40 p-3">
            <p className="text-gray-500 uppercase mb-1">Samples</p>
            <p className="text-white text-lg font-semibold">{POINT_COUNT}</p>
          </div>
          <div className="rounded border border-gray-800 bg-gray-900/40 p-3">
            <p className="text-gray-500 uppercase mb-1">Refresh</p>
            <p className="text-white text-lg font-semibold">1s</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PolyLineChart

