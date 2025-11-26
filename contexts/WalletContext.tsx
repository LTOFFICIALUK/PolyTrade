'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface WalletContextType {
  isConnected: boolean
  walletAddress: string | null
  connectWallet: (address: string) => void
  disconnectWallet: () => void
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [isConnected, setIsConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)

  // Load wallet from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('walletAddress')
      if (stored) {
        setWalletAddress(stored)
        setIsConnected(true)
      }
    }
  }, [])

  const connectWallet = (address: string) => {
    setWalletAddress(address)
    setIsConnected(true)
    // Store in localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('walletAddress', address)
    }
  }

  const disconnectWallet = () => {
    setWalletAddress(null)
    setIsConnected(false)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('walletAddress')
    }
  }

  return (
    <WalletContext.Provider
      value={{
        isConnected,
        walletAddress,
        connectWallet,
        disconnectWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export const useWallet = () => {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}

