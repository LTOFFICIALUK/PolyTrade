'use client'

import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { useTradingContext } from '@/contexts/TradingContext'
import useCurrentMarket from '@/hooks/useCurrentMarket'

interface ChartPoint {
  time: number
  upPrice: number
  downPrice: number
}

const PolyLineChart = () => {
  const { selectedPair, selectedTimeframe } = useTradingContext()
  const { market } = useCurrentMarket({
    pair: selectedPair,
    timeframe: selectedTimeframe,
  })
  
  const [series, setSeries] = useState<ChartPoint[]>([])
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const previousMarketIdRef = useRef<string | null>(null)

  // Fetch current bid prices for both UP and DOWN tokens from orderbook
  const fetchPrices = useCallback(async (): Promise<{ upPrice: number | null; downPrice: number | null }> => {
    if (!market?.yesTokenId || !market?.noTokenId) {
      return { upPrice: null, downPrice: null }
    }

    try {
      // Fetch orderbooks for both UP and DOWN tokens in parallel
      const [upResponse, downResponse] = await Promise.all([
        fetch(`/api/polymarket/orderbook?tokenId=${market.yesTokenId}`),
        fetch(`/api/polymarket/orderbook?tokenId=${market.noTokenId}`),
      ])

      let upPrice: number | null = null
      let downPrice: number | null = null

      if (upResponse.ok) {
        const upData = await upResponse.json()
        const bids = upData?.bids || []
        
        if (bids.length > 0) {
          // Get best bid (highest price, first in sorted array)
          const bestBid = bids[0]
          let price = typeof bestBid.price === 'string' ? parseFloat(bestBid.price) : bestBid.price
          
          // Convert to cents if needed (if price > 1, it's already in cents)
          if (price <= 1) {
            price = price * 100
          }
          
          upPrice = price
        }
      }

      if (downResponse.ok) {
        const downData = await downResponse.json()
        const bids = downData?.bids || []
        
        if (bids.length > 0) {
          // Get best bid (highest price, first in sorted array)
          const bestBid = bids[0]
          let price = typeof bestBid.price === 'string' ? parseFloat(bestBid.price) : bestBid.price
          
          // Convert to cents if needed (if price > 1, it's already in cents)
          if (price <= 1) {
            price = price * 100
          }
          
          downPrice = price
        }
      }

      return { upPrice, downPrice }
    } catch (err) {
      console.error('Error fetching prices:', err)
      return { upPrice: null, downPrice: null }
    }
  }, [market?.yesTokenId, market?.noTokenId])

  // Update chart data every second
  useEffect(() => {
    // Check if market changed
    const marketChanged = previousMarketIdRef.current !== null && previousMarketIdRef.current !== market?.marketId
    if (marketChanged && market?.marketId) {
      console.log(`[PolyLineChart] Market changed: ${previousMarketIdRef.current} → ${market.marketId}, resetting chart`)
      setSeries([])
    }
    previousMarketIdRef.current = market?.marketId ?? null

    // Only start charting if we have event start/end times
    if (!market?.startTime || !market?.endTime) {
      setSeries([])
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    const eventStartTime = market.startTime
    const eventEndTime = market.endTime
    const now = Date.now()

    // Don't chart if event hasn't started yet or has already ended
    if (now < eventStartTime || now > eventEndTime) {
      setSeries([])
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // Initial fetch
    const updateChart = async () => {
      const { upPrice, downPrice } = await fetchPrices()
      if (upPrice === null && downPrice === null) return

      const currentTime = Date.now()
      const isMarketChanged = previousMarketIdRef.current !== market?.marketId
      
      setSeries((prev) => {
        // Filter out points outside the event window or from different markets
        const filtered = prev.filter((point) => point.time >= eventStartTime && point.time <= eventEndTime)
        
        // Use previous prices if new ones aren't available
        const lastPoint = filtered[filtered.length - 1]
        const finalUpPrice = upPrice !== null ? upPrice : (lastPoint?.upPrice ?? 0)
        const finalDownPrice = downPrice !== null ? downPrice : (lastPoint?.downPrice ?? 0)
        
        // Add new point
        const newPoint: ChartPoint = {
          time: currentTime,
          upPrice: finalUpPrice,
          downPrice: finalDownPrice,
        }

        // If this is the first point or market changed, initialize from event start
        if (filtered.length === 0 || isMarketChanged) {
          const points: ChartPoint[] = []
          
          // Start from event start time, but if we're already into the event, start from a reasonable point
          const startTime = Math.max(eventStartTime, currentTime - 60 * 1000) // Start from 1 minute ago or event start, whichever is later
          
          // Create points every second from start time to now
          for (let t = startTime; t <= currentTime; t += 1000) {
            points.push({
              time: t,
              upPrice: finalUpPrice,
              downPrice: finalDownPrice,
            })
          }
          
          return points
        }

        // Check if we already have a point for this second (avoid duplicates)
        if (lastPoint && Math.abs(lastPoint.time - currentTime) < 500) {
          // Update existing point if it's within 500ms
          return filtered.slice(0, -1).concat([newPoint])
        }

        // Add new point, keeping only points within event window
        const updated = [...filtered, newPoint].filter(
          (point) => point.time >= eventStartTime && point.time <= eventEndTime
        )
        
        return updated
      })
    }

    // Initial fetch
    updateChart()

    // Update every second
    intervalRef.current = setInterval(updateChart, 1000)

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
    }, [market?.startTime, market?.endTime, market?.marketId, fetchPrices])

  const { upLinePath, downLinePath, minPrice, maxPrice, paddedMin, paddedMax, eventStartTime, eventEndTime } = useMemo(() => {
    if (!series.length || !market?.startTime || !market?.endTime) {
      return { 
        upLinePath: '', 
        downLinePath: '',
        minPrice: 1, 
        maxPrice: 99, 
        paddedMin: 1, 
        paddedMax: 99,
        eventStartTime: null,
        eventEndTime: null,
      }
    }

    const eventStart = market.startTime
    const eventEnd = market.endTime
    
    // Fixed Y-axis range: always 1c to 99c
    const minValue = 1
    const maxValue = 99
    const range = maxValue - minValue // 98

    // Create path for UP line (green)
    const upPathParts: string[] = []
    series.forEach((point, idx) => {
      if (point.upPrice <= 0) return // Skip invalid points
      
      // Calculate X position based on time within event window
      const timeProgress = (point.time - eventStart) / (eventEnd - eventStart)
      const x = Math.max(0, Math.min(100, timeProgress * 100))
      
      // Calculate Y position based on price (1c = bottom at 100%, 99c = top at 0%)
      // Map price from 1-99 range to full height (0-100%)
      // Formula: y = 100 - ((price - 1) / 98) * 100
      // At price = 1c: y = 100 - 0 = 100 (bottom)
      // At price = 99c: y = 100 - 100 = 0 (top)
      const normalized = 100 - ((point.upPrice - minValue) / range) * 100
      
      if (upPathParts.length === 0) {
        upPathParts.push(`M ${x.toFixed(2)} ${normalized.toFixed(2)}`)
      } else {
        upPathParts.push(`L ${x.toFixed(2)} ${normalized.toFixed(2)}`)
      }
    })

    // Create path for DOWN line (red)
    const downPathParts: string[] = []
    series.forEach((point, idx) => {
      if (point.downPrice <= 0) return // Skip invalid points
      
      // Calculate X position based on time within event window
      const timeProgress = (point.time - eventStart) / (eventEnd - eventStart)
      const x = Math.max(0, Math.min(100, timeProgress * 100))
      
      // Calculate Y position based on price (1c = bottom at 100%, 99c = top at 0%)
      // Map price from 1-99 range to full height (0-100%)
      // Formula: y = 100 - ((price - 1) / 98) * 100
      // At price = 1c: y = 100 - 0 = 100 (bottom)
      // At price = 99c: y = 100 - 100 = 0 (top)
      const normalized = 100 - ((point.downPrice - minValue) / range) * 100
      
      if (downPathParts.length === 0) {
        downPathParts.push(`M ${x.toFixed(2)} ${normalized.toFixed(2)}`)
      } else {
        downPathParts.push(`L ${x.toFixed(2)} ${normalized.toFixed(2)}`)
      }
    })

    return {
      upLinePath: upPathParts.join(' '),
      downLinePath: downPathParts.join(' '),
      minPrice: minValue,
      maxPrice: maxValue,
      paddedMin: minValue,
      paddedMax: maxValue,
      eventStartTime: eventStart,
      eventEndTime: eventEnd,
    }
  }, [series, market?.startTime, market?.endTime])

  const latest = series[series.length - 1]
  const currentUpPrice = latest?.upPrice || null
  const currentDownPrice = latest?.downPrice || null

  // Format time for display
  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return ''
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  // Format date for display
  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return ''
    return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  if (!market?.startTime || !market?.endTime) {
    return (
      <div className="w-full h-full bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 text-sm">Waiting for event data...</p>
        </div>
      </div>
    )
  }

  const now = Date.now()
  const eventStarted = now >= market.startTime
  const eventEnded = now > market.endTime

  if (!eventStarted) {
    return (
      <div className="w-full h-full bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 text-sm">Event starts at {formatTime(market.startTime)}</p>
          <p className="text-gray-500 text-xs mt-1">{formatDate(market.startTime)}</p>
        </div>
      </div>
    )
  }

  if (eventEnded) {
    return (
      <div className="w-full h-full bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 text-sm">Event ended at {formatTime(market.endTime)}</p>
          <p className="text-gray-500 text-xs mt-1">{formatDate(market.endTime)}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full bg-black text-white relative overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 pointer-events-none opacity-10">
        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(#1a1a1a 1px, transparent 1px)', backgroundSize: '100% 20%' }} />
        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(90deg, #1a1a1a 1px, transparent 1px)', backgroundSize: '12.5% 100%' }} />
      </div>

      <div className="relative h-full flex flex-col p-4 gap-4">
        <div className="flex items-center justify-between text-xs sm:text-sm flex-shrink-0">
          <div>
            <p className="text-gray-400 uppercase tracking-widest">POLY ORDERBOOK</p>
            <p className="text-lg font-semibold">{selectedPair} • Live Bid</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            {currentUpPrice !== null && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-green-400 font-semibold">UP {currentUpPrice.toFixed(2)}¢</span>
              </div>
            )}
            {currentDownPrice !== null && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-red-400 font-semibold">DOWN {currentDownPrice.toFixed(2)}¢</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 relative min-h-0">
          {upLinePath || downLinePath ? (
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full absolute inset-0">
              <defs>
                <filter id="glowUp" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#10b981" floodOpacity="0.5" />
                </filter>
                <filter id="glowDown" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#ef4444" floodOpacity="0.5" />
                </filter>
              </defs>
              {/* UP line (green) */}
              {upLinePath && (
                <path
                  d={upLinePath}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#glowUp)"
                />
              )}
              {/* DOWN line (red) */}
              {downLinePath && (
                <path
                  d={downLinePath}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#glowDown)"
                />
              )}
            </svg>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-gray-500 text-sm">Loading chart data...</p>
            </div>
          )}

          {/* Y-axis labels (price) - Fixed range 1c to 99c */}
          <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between pl-1 pt-2 pb-8 text-[10px] text-gray-500" style={{ paddingTop: '8px', paddingBottom: '24px' }}>
            {Array.from({ length: 5 }).map((_, idx) => {
              // Fixed values: 99c, 75c, 50c, 25c, 1c
              // Position: top (99c), 25%, 50%, 75%, bottom (1c)
              const values = [99, 75, 50, 25, 1]
              const value = values[idx]
              return (
                <div key={idx} className="flex items-center gap-2">
                  <span className="block w-12 text-right font-semibold">{value}¢</span>
                  <span className="h-px flex-1 bg-gray-800/60" />
                </div>
              )
            })}
          </div>

          {/* X-axis labels (time) */}
          {eventStartTime && eventEndTime && (
            <div className="absolute left-0 right-0 bottom-0 flex justify-between pl-14 pr-2 pb-1 text-[10px] text-gray-500" style={{ paddingLeft: '56px', paddingBottom: '4px' }}>
              {Array.from({ length: 5 }).map((_, idx) => {
                const timeProgress = idx / 4
                const timestamp = eventStartTime + (eventEndTime - eventStartTime) * timeProgress
                const timeLabel = formatTime(timestamp)
                return (
                  <span key={idx} className="font-semibold">
                    {timeLabel}
                  </span>
                )
              })}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

export default PolyLineChart

