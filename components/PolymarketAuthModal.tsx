'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useWallet } from '@/contexts/WalletContext'
import { signClobAuthMessage, ensurePolygonNetwork, getBrowserProvider } from '@/lib/polymarket-auth'
import { ethers } from 'ethers'

interface PolymarketAuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function PolymarketAuthModal({ isOpen, onClose, onSuccess }: PolymarketAuthModalProps) {
  const { walletAddress, setPolymarketCredentials } = useWallet()
  const [step, setStep] = useState<'sign' | 'generating' | 'success' | 'error'>('sign')
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen) {
      setStep('sign')
      setError('')
    }
  }, [isOpen])

  const handleAuthenticate = async () => {
    if (!walletAddress) {
      setError('Please connect your wallet first')
      return
    }

    setError('')
    setStep('generating')

    try {
      const provider = getBrowserProvider()
      if (!provider) {
        throw new Error('No wallet provider found. Please install MetaMask or Phantom.')
      }

      // Ensure we're on Polygon network
      await ensurePolygonNetwork(provider)

      // Sign the EIP-712 message
      const signature = await signClobAuthMessage(provider, walletAddress)

      // Generate API key
      const response = await fetch('/api/polymarket/auth/api-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: signature.address,
          signature: signature.signature,
          timestamp: signature.timestamp,
          nonce: signature.nonce,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate API key')
      }

      const credentials = await response.json()
      
      // Store credentials
      setPolymarketCredentials({
        apiKey: credentials.apiKey,
        secret: credentials.secret,
        passphrase: credentials.passphrase,
      })

      setStep('success')
      
      // Auto-close after success
      setTimeout(() => {
        onSuccess?.()
        onClose()
      }, 2000)
    } catch (err: any) {
      console.error('Polymarket authentication error:', err)
      setError(err.message || 'Failed to authenticate with Polymarket')
      setStep('error')
    }
  }

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
        className="bg-black border border-gray-800 rounded-lg w-full max-w-md overflow-hidden flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-black">
          <h2 className="text-2xl font-bold text-white">Connect to Polymarket</h2>
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
          {step === 'sign' && (
            <div className="space-y-4">
              <div className="bg-purple-primary/10 border border-purple-primary/30 rounded-lg p-4">
                <p className="text-gray-300 text-sm">
                  To enable fast trading on Polymarket, you need to sign a message to generate API credentials.
                  This is a one-time setup that allows you to trade without signing each transaction.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-white font-semibold">What happens:</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-300 text-sm">
                  <li>Switch to Polygon network (if needed)</li>
                  <li>Sign an authentication message</li>
                  <li>Generate API credentials for fast trading</li>
                </ul>
              </div>

              {error && (
                <div className="p-3 bg-red-900/20 border border-red-800/50 rounded">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
            </div>
          )}

          {step === 'generating' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <svg
                className="animate-spin h-12 w-12 text-purple-primary"
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
              <p className="text-gray-300 text-center">
                Please approve the signature request in your wallet...
              </p>
            </div>
          )}

          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <svg
                className="w-16 h-16 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <p className="text-white text-lg font-semibold">Successfully connected!</p>
              <p className="text-gray-400 text-sm text-center">
                You can now trade on Polymarket with fast execution.
              </p>
            </div>
          )}

          {step === 'error' && (
            <div className="space-y-4">
              <div className="p-4 bg-red-900/20 border border-red-800/50 rounded">
                <p className="text-red-400 font-semibold mb-2">Authentication Failed</p>
                <p className="text-gray-300 text-sm">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 'generating' && step !== 'success' && (
          <div className="p-6 border-t border-gray-800 flex gap-3 bg-black">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-900 border border-gray-800 text-white rounded hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            {step === 'sign' && (
              <button
                onClick={handleAuthenticate}
                className="flex-1 px-4 py-2 bg-purple-primary hover:bg-purple-hover text-white rounded transition-colors font-medium"
              >
                Sign & Connect
              </button>
            )}
            {step === 'error' && (
              <button
                onClick={() => {
                  setStep('sign')
                  setError('')
                }}
                className="flex-1 px-4 py-2 bg-purple-primary hover:bg-purple-hover text-white rounded transition-colors font-medium"
              >
                Try Again
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

