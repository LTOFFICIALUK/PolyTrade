'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface TradingContextType {
  selectedPair: string
  selectedTimeframe: string
  showTradingView: boolean
  activeTokenId: 'up' | 'down'
  marketOffset: number // 0 = current, -1 = previous, +1 = next, etc.
  setSelectedPair: (pair: string) => void
  setSelectedTimeframe: (timeframe: string) => void
  setShowTradingView: (show: boolean) => void
  setActiveTokenId: (tokenId: 'up' | 'down') => void
  setMarketOffset: (offset: number) => void
}

const TradingContext = createContext<TradingContextType | undefined>(undefined)

export const TradingProvider = ({ children }: { children: ReactNode }) => {
  const [selectedPair, setSelectedPair] = useState('BTC')
  const [selectedTimeframe, setSelectedTimeframe] = useState('1h')
  const [showTradingView, setShowTradingView] = useState(false)
  const [activeTokenId, setActiveTokenId] = useState<'up' | 'down'>('up')
  const [marketOffset, setMarketOffset] = useState(0)

  // Reset market offset when pair or timeframe changes
  const handleSetSelectedPair = (pair: string) => {
    setSelectedPair(pair)
    setMarketOffset(0)
  }

  const handleSetSelectedTimeframe = (timeframe: string) => {
    setSelectedTimeframe(timeframe)
    setMarketOffset(0)
  }

  return (
    <TradingContext.Provider
      value={{
        selectedPair,
        selectedTimeframe,
        showTradingView,
        activeTokenId,
        marketOffset,
        setSelectedPair: handleSetSelectedPair,
        setSelectedTimeframe: handleSetSelectedTimeframe,
        setShowTradingView,
        setActiveTokenId,
        setMarketOffset,
      }}
    >
      {children}
    </TradingContext.Provider>
  )
}

export const useTradingContext = () => {
  const context = useContext(TradingContext)
  if (context === undefined) {
    throw new Error('useTradingContext must be used within a TradingProvider')
  }
  return context
}

