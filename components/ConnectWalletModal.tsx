'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useWallet } from '@/contexts/WalletContext'

interface ConnectWalletModalProps {
  isOpen: boolean
  onClose: () => void
}

// Extend Window interface for Phantom
declare global {
  interface Window {
    phantom?: {
      ethereum: {
        request: (args: { method: string; params?: any[] }) => Promise<any>
        isPhantom?: boolean
      }
    }
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>
      isPhantom?: boolean
      providers?: any[]
    }
  }
}

export default function ConnectWalletModal({ isOpen, onClose }: ConnectWalletModalProps) {
  const { connectWallet } = useWallet()
  const [showInstructions, setShowInstructions] = useState(false)
  const [error, setError] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleConnectPhantom = async () => {
    setError('')
    setIsConnecting(true)

    try {
      // Check if Phantom is available - Phantom can expose itself in different ways
      let phantomProvider = null

      // Method 1: Check window.phantom.ethereum (primary method)
      if ((window as any).phantom?.ethereum) {
        phantomProvider = (window as any).phantom.ethereum
      }
      // Method 2: Check if window.ethereum is Phantom
      else if (window.ethereum && (window.ethereum as any).isPhantom) {
        phantomProvider = window.ethereum
      }
      // Method 3: Check providers array for Phantom
      else if (window.ethereum && (window.ethereum as any).providers) {
        const providers = (window.ethereum as any).providers
        phantomProvider = Array.isArray(providers)
          ? providers.find((p: any) => p.isPhantom)
          : null
      }

      if (!phantomProvider) {
        setError('Phantom is not installed. Please install Phantom extension first.')
        setIsConnecting(false)
        return
      }

      // Request account access from Phantom
      const accounts = await phantomProvider.request({
        method: 'eth_requestAccounts',
      })

      if (accounts && accounts.length > 0) {
        const address = accounts[0]
        connectWallet(address)
        onClose()
      } else {
        setError('No accounts found. Please make sure your Phantom wallet is unlocked.')
      }
    } catch (err: any) {
      console.error('Phantom connection error:', err)
      if (err.code === 4001) {
        setError('Connection rejected. Please approve the connection request in Phantom.')
      } else {
        setError('Failed to connect wallet. Please make sure Phantom is installed, enabled, and unlocked.')
      }
    } finally {
      setIsConnecting(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      console.log('Modal is open, rendering...')
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen || !mounted) return null

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        className="bg-black border border-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '42rem',
        }}
      >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-black">
            <h2 className="text-2xl font-bold text-white">Connect Wallet</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Important Notice */}
            <div className="bg-purple-primary/10 border border-purple-primary/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-purple-primary mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <h3 className="text-purple-primary font-semibold mb-1">
                    Connect with Your Polymarket Wallet
                  </h3>
                  <p className="text-gray-300 text-sm">
                    Log in using your Polymarket wallet through Phantom. First export your private
                    key from Polymarket, then import it into Phantom.
                  </p>
                </div>
              </div>
            </div>

            {/* Instructions Toggle */}
            <div>
              <button
                onClick={() => setShowInstructions(!showInstructions)}
                className="w-full flex items-center justify-between p-4 bg-black/50 border border-gray-800 rounded-lg hover:bg-black/70 transition-colors"
              >
                <span className="text-white font-medium">
                  How to Log In to Polymarket
                </span>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${
                    showInstructions ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {showInstructions && (
                <div className="mt-4 p-4 bg-black/50 border border-gray-800 rounded-lg space-y-4">
                  <div>
                    <h4 className="text-white font-semibold mb-3">Step-by-Step Instructions:</h4>
                    <ol className="list-decimal list-inside space-y-3 text-gray-300 text-sm">
                      <li>Go to Polymarket Settings</li>
                      <li>Click "Export private key"</li>
                      <li>Copy your private key</li>
                      <li>Open Phantom extension</li>
                      <li>Click "Add wallet" and paste in your private key</li>
                      <li>Go back to PolyTrade and click "Connect wallet" to log in with your Polymarket wallet through Phantom</li>
                    </ol>
                  </div>

                  <div className="pt-4 border-t border-gray-800 bg-blue-900/20 border border-blue-800/50 rounded p-3">
                    <p className="text-blue-400 text-sm font-semibold mb-1">ℹ️ Important</p>
                    <p className="text-gray-300 text-xs">
                      You need to import your Polymarket wallet into Phantom first. Once imported,
                      you can connect to PolyTrade using the "Connect wallet" button below.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Phantom Connection */}
            <div>
              {error && (
                <div className="mb-4 p-3 bg-red-900/20 border border-red-800/50 rounded">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
              <div className="bg-black/50 border border-gray-800 rounded-lg p-4">
                <p className="text-gray-300 text-sm mb-4">
                  Make sure you've imported your Polymarket wallet into Phantom before connecting.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-800 flex gap-3 bg-black">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-900 border border-gray-800 text-white rounded hover:bg-gray-800 transition-colors"
            disabled={isConnecting}
          >
            Cancel
          </button>
          <button
            onClick={handleConnectPhantom}
            disabled={isConnecting}
            className="flex-1 px-4 py-2 bg-purple-primary hover:bg-purple-hover text-white rounded transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isConnecting ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Connecting...
              </>
            ) : (
              'Connect Wallet'
            )}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

