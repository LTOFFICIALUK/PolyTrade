'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useWallet } from '@/contexts/WalletContext'
import { getBrowserProvider, ensurePolygonNetwork } from '@/lib/polymarket-auth'
import { ethers } from 'ethers'

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
      isMetaMask?: boolean
    }
  }
}

export default function ConnectWalletModal({ isOpen, onClose }: ConnectWalletModalProps) {
  const { connectWallet } = useWallet()
  const [showInstructions, setShowInstructions] = useState(false)
  const [error, setError] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [walletType, setWalletType] = useState<'metamask' | 'phantom' | null>(null)

  useEffect(() => {
    setMounted(true)
    // Detect available wallets
    if (typeof window !== 'undefined') {
      if (window.ethereum?.isMetaMask) {
        setWalletType('metamask')
      } else if ((window as any).phantom?.ethereum || window.ethereum?.isPhantom) {
        setWalletType('phantom')
      }
    }
  }, [])

  const handleConnectWallet = async (preferredType?: 'metamask' | 'phantom') => {
    setError('')
    setIsConnecting(true)

    try {
      const provider = getBrowserProvider()
      if (!provider) {
        setError('No wallet found. Please install MetaMask or Phantom extension.')
        setIsConnecting(false)
        return
      }

      // Request account access FIRST (required before switching networks)
      const accounts = await provider.send('eth_requestAccounts', [])

      if (!accounts || accounts.length === 0) {
        setError('No accounts found. Please make sure your wallet is unlocked.')
        setIsConnecting(false)
        return
      }

      // Now ensure we're on Polygon network (after authorization)
      await ensurePolygonNetwork(provider)

      const address = accounts[0]
      connectWallet(address)
      onClose()
    } catch (err: any) {
      console.error('Wallet connection error:', err)
      if (err.code === 4001) {
        if (err.message?.includes('network switch')) {
          setError('Network switch was rejected. Please approve the switch to Polygon in your wallet.')
        } else {
          setError('Connection rejected. Please approve the connection request in your wallet.')
        }
      } else if (err.message?.includes('network switch') || err.message?.includes('switch network')) {
        setError('Please approve the network switch to Polygon in your wallet.')
      } else if (err.message?.includes('rejected')) {
        setError(err.message)
      } else {
        setError('Failed to connect wallet. Please make sure your wallet is installed, enabled, and unlocked.')
      }
    } finally {
      setIsConnecting(false)
    }
  }

  const handleConnectPhantom = () => handleConnectWallet('phantom')
  const handleConnectMetaMask = () => handleConnectWallet('metamask')

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
        <div 
          className="flex-1 overflow-y-auto p-6 scrollbar-hide"
          style={{ 
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
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
                    Trade with Your Polymarket Account
                  </h3>
                  <p className="text-gray-300 text-sm">
                    You can use your existing Polymarket wallet! Export your private key from Polymarket and import it into MetaMask or Phantom, then connect here to trade with your Polymarket account.
                  </p>
                </div>
              </div>
            </div>

            {/* Polymarket Wallet Instructions */}
            <div>
              <button
                onClick={() => setShowInstructions(!showInstructions)}
                className="w-full flex items-center justify-between p-4 bg-black/50 border border-gray-800 rounded-lg hover:bg-black/70 transition-colors"
              >
                <span className="text-white font-medium">
                  How to Use Your Polymarket Wallet
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
                      <li>Go to <a href="https://polymarket.com" target="_blank" rel="noopener noreferrer" className="text-purple-primary hover:underline">Polymarket.com</a> and log in</li>
                      <li>Go to Settings → Security → Export Private Key</li>
                      <li>Copy your private key (keep it secure!)</li>
                      <li>Open MetaMask or Phantom extension</li>
                      <li>Click "Import Account" or "Add Wallet"</li>
                      <li>Paste your private key to import your Polymarket wallet</li>
                      <li>Come back here and click "Connect Wallet" to use your Polymarket account</li>
                    </ol>
                  </div>

                  <div className="pt-4 border-t border-gray-800 bg-blue-900/20 border border-blue-800/50 rounded p-3">
                    <p className="text-blue-400 text-sm font-semibold mb-1">What This Means</p>
                    <p className="text-gray-300 text-xs">
                      Once imported, you'll have access to all your Polymarket funds, positions, and trading history. All trades will use your Polymarket account balance.
                    </p>
                  </div>
                </div>
              )}
            </div>


            {/* Wallet Connection Options */}
            <div>
              {error && (
                <div className="mb-4 p-3 bg-red-900/20 border border-red-800/50 rounded">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
              
              <div className="space-y-3">
                {/* MetaMask Option */}
                <button
                  onClick={handleConnectMetaMask}
                  disabled={isConnecting || !window.ethereum?.isMetaMask}
                  className="w-full p-4 bg-black/50 border border-gray-800 rounded-lg hover:bg-black/70 transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <img 
                      src="/wallets/MetaMask-icon-fox.svg" 
                      alt="MetaMask" 
                      className="w-6 h-6"
                    />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-white font-medium">MetaMask</p>
                    <p className="text-gray-400 text-xs">
                      {window.ethereum?.isMetaMask ? 'Connect with MetaMask' : 'Install MetaMask extension'}
                    </p>
                  </div>
                  {!window.ethereum?.isMetaMask && (
                    <a
                      href="https://metamask.io/download/"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      Install →
                    </a>
                  )}
                </button>

                {/* Phantom Option */}
                <button
                  onClick={handleConnectPhantom}
                  disabled={isConnecting || (!(window as any).phantom?.ethereum && !window.ethereum?.isPhantom)}
                  className="w-full p-4 bg-black/50 border border-gray-800 rounded-lg hover:bg-black/70 transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <img 
                      src="/wallets/Phantom-Icon_Transparent_Purple.svg" 
                      alt="Phantom" 
                      className="w-6 h-6"
                    />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-white font-medium">Phantom</p>
                    <p className="text-gray-400 text-xs">
                      {((window as any).phantom?.ethereum || window.ethereum?.isPhantom) ? 'Connect with Phantom' : 'Install Phantom extension'}
                    </p>
                  </div>
                  {!(window as any).phantom?.ethereum && !window.ethereum?.isPhantom && (
                    <a
                      href="https://phantom.app/"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      Install →
                    </a>
                  )}
                </button>
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
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

