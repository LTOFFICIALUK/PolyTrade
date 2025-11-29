'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface TradingContextType {
  selectedPair: string
  selectedTimeframe: string
  showTradingView: boolean
  activeTokenId: 'up' | 'down'
  setSelectedPair: (pair: string) => void
  setSelectedTimeframe: (timeframe: string) => void
  setShowTradingView: (show: boolean) => void
  setActiveTokenId: (tokenId: 'up' | 'down') => void
}

const TradingContext = createContext<TradingContextType | undefined>(undefined)

export const TradingProvider = ({ children }: { children: ReactNode }) => {
  const [selectedPair, setSelectedPair] = useState('BTC')
  const [selectedTimeframe, setSelectedTimeframe] = useState('1h')
  const [showTradingView, setShowTradingView] = useState(false)
  const [activeTokenId, setActiveTokenId] = useState<'up' | 'down'>('up')

  return (
    <TradingContext.Provider
      value={{
        selectedPair,
        selectedTimeframe,
        showTradingView,
        activeTokenId,
        setSelectedPair,
        setSelectedTimeframe,
        setShowTradingView,
        setActiveTokenId,
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

