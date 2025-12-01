'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface PolymarketApiCredentials {
  apiKey: string
  secret: string
  passphrase: string
}

interface WalletContextType {
  isConnected: boolean
  walletAddress: string | null
  connectWallet: (address: string) => void
  disconnectWallet: () => void
  // Polymarket API credentials
  polymarketCredentials: PolymarketApiCredentials | null
  setPolymarketCredentials: (creds: PolymarketApiCredentials | null) => void
  isPolymarketAuthenticated: boolean
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

const POLYMARKET_CREDS_KEY = 'polymarket_api_credentials'

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [isConnected, setIsConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [polymarketCredentials, setPolymarketCredentialsState] = useState<PolymarketApiCredentials | null>(null)

  // Load wallet and Polymarket credentials from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('walletAddress')
      if (stored) {
        setWalletAddress(stored)
        setIsConnected(true)
      }

      // Load Polymarket credentials
      const storedCreds = localStorage.getItem(POLYMARKET_CREDS_KEY)
      if (storedCreds) {
        try {
          const creds = JSON.parse(storedCreds)
          setPolymarketCredentialsState(creds)
        } catch (error) {
          console.error('Failed to parse stored Polymarket credentials:', error)
          localStorage.removeItem(POLYMARKET_CREDS_KEY)
        }
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
    setPolymarketCredentialsState(null)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('walletAddress')
      localStorage.removeItem(POLYMARKET_CREDS_KEY)
    }
  }

  const setPolymarketCredentials = (creds: PolymarketApiCredentials | null) => {
    setPolymarketCredentialsState(creds)
    if (typeof window !== 'undefined') {
      if (creds) {
        localStorage.setItem(POLYMARKET_CREDS_KEY, JSON.stringify(creds))
      } else {
        localStorage.removeItem(POLYMARKET_CREDS_KEY)
      }
    }
  }

  return (
    <WalletContext.Provider
      value={{
        isConnected,
        walletAddress,
        connectWallet,
        disconnectWallet,
        polymarketCredentials,
        setPolymarketCredentials,
        isPolymarketAuthenticated: polymarketCredentials !== null,
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

