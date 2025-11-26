'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface TradingContextType {
  selectedPair: string
  selectedTimeframe: string
  showTradingView: boolean
  setSelectedPair: (pair: string) => void
  setSelectedTimeframe: (timeframe: string) => void
  setShowTradingView: (show: boolean) => void
}

const TradingContext = createContext<TradingContextType | undefined>(undefined)

export const TradingProvider = ({ children }: { children: ReactNode }) => {
  const [selectedPair, setSelectedPair] = useState('BTC')
  const [selectedTimeframe, setSelectedTimeframe] = useState('1h')
  const [showTradingView, setShowTradingView] = useState(false)

  return (
    <TradingContext.Provider
      value={{
        selectedPair,
        selectedTimeframe,
        showTradingView,
        setSelectedPair,
        setSelectedTimeframe,
        setShowTradingView,
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

