'use client'

import { useEffect, useState } from 'react'
import { useWebSocket } from '@/contexts/WebSocketContext'
import { useTradingContext } from '@/contexts/TradingContext'
import usePolymarketPrices from '@/hooks/usePolymarketPrices'

interface OrderBookEntry {
  price: number
  size: number
  total?: number
}

interface OrderBookData {
  bids: OrderBookEntry[]
  asks: OrderBookEntry[]
  tokenId?: string
}

const OrderBook = () => {
  const { selectedPair, selectedTimeframe } = useTradingContext()
  const { isConnected, subscribe, sendMessage } = useWebSocket()
  const [orderBook, setOrderBook] = useState<OrderBookData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Get token IDs for the selected pair/timeframe
  const { prices } = usePolymarketPrices({
    pair: selectedPair,
    timeframe: selectedTimeframe,
    interval: 5000,
    useWebSocket: false,
  })

  useEffect(() => {
    if (!isConnected) {
      setError('WebSocket not connected')
      setLoading(false)
      return
    }

    // Fetch initial orderbook data via REST API
    const fetchInitialOrderbook = async () => {
      try {
        // First, get token IDs from market search
        const searchResponse = await fetch(
          `/api/polymarket/market-search?pair=${encodeURIComponent(selectedPair)}&timeframe=${encodeURIComponent(selectedTimeframe)}`
        )

        if (!searchResponse.ok) {
          throw new Error('Failed to find market')
        }

        const tokens = await searchResponse.json()
        if (!tokens?.yes || !tokens?.no) {
          throw new Error('Token IDs not found')
        }

        // Fetch orderbook for YES token
        const orderbookResponse = await fetch(
          `/api/polymarket/orderbook?tokenId=${tokens.yes}`
        )

        if (!orderbookResponse.ok) {
          throw new Error('Failed to fetch orderbook')
        }

        const orderbookData = await orderbookResponse.json()
        setOrderBook(orderbookData)
        setLoading(false)
        setError(null)
      } catch (err) {
        console.error('Error fetching orderbook:', err)
        setError(err instanceof Error ? err.message : 'Failed to load orderbook')
        setLoading(false)
      }
    }

    fetchInitialOrderbook()

    // Subscribe to orderbook updates via WebSocket
    // We need to get tokenId first, then subscribe
    let unsubscribe: (() => void) | null = null
    
    const setupSubscription = async () => {
      try {
        const searchResponse = await fetch(
          `/api/polymarket/market-search?pair=${encodeURIComponent(selectedPair)}&timeframe=${encodeURIComponent(selectedTimeframe)}`
        )
        
        if (searchResponse.ok) {
          const tokens = await searchResponse.json()
          if (tokens?.yes) {
            // Set up callback to receive orderbook updates
            unsubscribe = subscribe('orderbook', (data: any) => {
              if (data && !data.error) {
                setOrderBook(data)
                setLoading(false)
                setError(null)
              }
            })
            
            // Send subscription message with tokenId
            // Note: We send this manually because subscribe() doesn't support extra params
            sendMessage({
              type: 'subscribe',
              topic: 'orderbook',
              tokenId: tokens.yes,
            })
          }
        }
      } catch (err) {
        console.error('Error setting up orderbook subscription:', err)
      }
    }
    
    if (isConnected) {
      setupSubscription()
    }

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [isConnected, subscribe, sendMessage, selectedPair, selectedTimeframe])

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
        Loading orderbook...
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center text-red-400 text-sm">
        {error}
      </div>
    )
  }

  if (!orderBook) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
        No orderbook data available
      </div>
    )
  }

  // Extract bids and asks from orderbook data
  // Polymarket API returns data in various formats, handle multiple possibilities
  let bids: OrderBookEntry[] = []
  let asks: OrderBookEntry[] = []

  if (Array.isArray(orderBook)) {
    // If array, take first element
    const data = orderBook[0]
    bids = data?.bids || data?.buyOrders || []
    asks = data?.asks || data?.sellOrders || []
  } else if (orderBook.bids || orderBook.asks) {
    bids = orderBook.bids || []
    asks = orderBook.asks || []
  } else if (orderBook.buyOrders || orderBook.sellOrders) {
    bids = orderBook.buyOrders || []
    asks = orderBook.sellOrders || []
  } else if (orderBook.data) {
    // Nested data structure
    bids = orderBook.data.bids || orderBook.data.buyOrders || []
    asks = orderBook.data.asks || orderBook.data.sellOrders || []
  }

  // Normalize price format (Polymarket may return prices as cents or decimals)
  bids = bids.map((bid) => ({
    ...bid,
    price: typeof bid.price === 'string' ? parseFloat(bid.price) : bid.price,
    size: typeof bid.size === 'string' ? parseFloat(bid.size) : bid.size,
  }))

  asks = asks.map((ask) => ({
    ...ask,
    price: typeof ask.price === 'string' ? parseFloat(ask.price) : ask.price,
    size: typeof ask.size === 'string' ? parseFloat(ask.size) : ask.size,
  }))

  // Sort bids descending (highest first) and asks ascending (lowest first)
  bids.sort((a, b) => b.price - a.price)
  asks.sort((a, b) => a.price - b.price)

  // Calculate cumulative totals
  let bidTotal = 0
  const bidsWithTotal = bids.map((bid) => {
    bidTotal += bid.size
    return { ...bid, total: bidTotal }
  })

  let askTotal = 0
  const asksWithTotal = asks.map((ask) => {
    askTotal += ask.size
    return { ...ask, total: askTotal }
  })

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex border-b border-gray-800">
        <div className="flex-1 px-4 py-2 text-xs text-gray-400 font-medium">
          Price
        </div>
        <div className="flex-1 px-4 py-2 text-xs text-gray-400 font-medium text-right">
          Size
        </div>
        <div className="flex-1 px-4 py-2 text-xs text-gray-400 font-medium text-right">
          Total
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Asks (Sell Orders) - Red */}
        <div className="flex flex-col">
          {asksWithTotal.length > 0 ? (
            asksWithTotal.map((ask, idx) => (
              <div
                key={`ask-${idx}`}
                className="flex border-b border-gray-800/50 hover:bg-gray-900/30"
              >
                <div className="flex-1 px-4 py-1.5 text-sm text-red-400">
                  ${ask.price > 1 ? (ask.price / 100).toFixed(2) : ask.price.toFixed(2)}
                </div>
                <div className="flex-1 px-4 py-1.5 text-sm text-gray-300 text-right">
                  {ask.size.toLocaleString()}
                </div>
                <div className="flex-1 px-4 py-1.5 text-sm text-gray-400 text-right">
                  {ask.total?.toLocaleString() || ''}
                </div>
              </div>
            ))
          ) : (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
              No asks available
            </div>
          )}
        </div>

        {/* Spread indicator */}
        {bids.length > 0 && asks.length > 0 && (
          <div className="px-4 py-2 border-y border-gray-800 bg-gray-900/20">
            <div className="text-center text-xs text-gray-400">
              Spread: ${(
                (asks[0].price > 1 ? asks[0].price / 100 : asks[0].price) -
                (bids[0].price > 1 ? bids[0].price / 100 : bids[0].price)
              ).toFixed(2)}
            </div>
          </div>
        )}

        {/* Bids (Buy Orders) - Green */}
        <div className="flex flex-col">
          {bidsWithTotal.length > 0 ? (
            bidsWithTotal.map((bid, idx) => (
              <div
                key={`bid-${idx}`}
                className="flex border-b border-gray-800/50 hover:bg-gray-900/30"
              >
                <div className="flex-1 px-4 py-1.5 text-sm text-green-400">
                  ${bid.price > 1 ? (bid.price / 100).toFixed(2) : bid.price.toFixed(2)}
                </div>
                <div className="flex-1 px-4 py-1.5 text-sm text-gray-300 text-right">
                  {bid.size.toLocaleString()}
                </div>
                <div className="flex-1 px-4 py-1.5 text-sm text-gray-400 text-right">
                  {bid.total?.toLocaleString() || ''}
                </div>
              </div>
            ))
          ) : (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
              No bids available
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default OrderBook

