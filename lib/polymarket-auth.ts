/**
 * Polymarket Authentication Utilities
 * Handles EIP-712 signing for Polymarket CLOB API authentication
 */

import { ethers } from 'ethers'

const POLYGON_CHAIN_ID = 137
const CLOB_AUTH_DOMAIN = {
  name: 'ClobAuthDomain',
  version: '1',
  chainId: POLYGON_CHAIN_ID,
}

const CLOB_AUTH_TYPES = {
  EIP712Domain: [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
    { name: 'chainId', type: 'uint256' },
  ],
  ClobAuth: [
    { name: 'address', type: 'address' },
    { name: 'timestamp', type: 'string' },
    { name: 'nonce', type: 'uint256' },
    { name: 'message', type: 'string' },
  ],
}

const AUTH_MESSAGE = 'This message attests that I control the given wallet'

export interface ClobAuthSignature {
  address: string
  timestamp: string
  nonce: number
  signature: string
}

/**
 * Generate EIP-712 signature for Polymarket authentication
 */
export async function signClobAuthMessage(
  provider: ethers.BrowserProvider,
  address: string
): Promise<ClobAuthSignature> {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const nonce = 0

  // Get checksummed address
  const checksummedAddress = ethers.getAddress(address)

  // Get signer from provider
  const signer = await provider.getSigner()

  // Domain for EIP-712
  const domain = {
    name: 'ClobAuthDomain',
    version: '1',
    chainId: POLYGON_CHAIN_ID,
  }

  // Types for EIP-712 (without EIP712Domain - ethers handles that)
  const types = {
    ClobAuth: [
      { name: 'address', type: 'address' },
      { name: 'timestamp', type: 'string' },
      { name: 'nonce', type: 'uint256' },
      { name: 'message', type: 'string' },
    ],
  }

  // Message to sign
  const value = {
    address: checksummedAddress,
    timestamp: timestamp,
    nonce: nonce,
    message: AUTH_MESSAGE,
  }

  try {
    // Use ethers.js signTypedData which handles formatting correctly
    const signature = await signer.signTypedData(domain, types, value)

    return {
      address: checksummedAddress,
      timestamp,
      nonce,
      signature,
    }
  } catch (error: any) {
    if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
      throw new Error('User rejected the signature request')
    }
    throw new Error(`Failed to sign message: ${error.message}`)
  }
}

/**
 * Switch wallet to Polygon network if not already on it
 */
export async function ensurePolygonNetwork(
  provider: ethers.BrowserProvider
): Promise<void> {
  try {
    const network = await provider.getNetwork()
    const currentChainId = Number(network.chainId)
    
    // Check if already on Polygon (chainId 137)
    if (currentChainId === POLYGON_CHAIN_ID) {
      return // Already on Polygon, no action needed
    }

    // Request to switch to Polygon
    try {
      await provider.send('wallet_switchEthereumChain', [
        { chainId: `0x${POLYGON_CHAIN_ID.toString(16)}` },
      ])
    } catch (switchError: any) {
      // If chain doesn't exist (error code 4902), add it
      if (switchError.code === 4902) {
        await provider.send('wallet_addEthereumChain', [
          {
            chainId: `0x${POLYGON_CHAIN_ID.toString(16)}`,
            chainName: 'Polygon Mainnet',
            nativeCurrency: {
              name: 'MATIC',
              symbol: 'MATIC',
              decimals: 18,
            },
            rpcUrls: ['https://polygon-rpc.com'],
            blockExplorerUrls: ['https://polygonscan.com'],
          },
        ])
      } else if (switchError.code === 4001) {
        throw new Error('User rejected network switch')
      } else {
        // If switch fails for other reasons, but we're already on Polygon, ignore it
        const recheckNetwork = await provider.getNetwork()
        if (Number(recheckNetwork.chainId) === POLYGON_CHAIN_ID) {
          return // Actually on Polygon now, ignore the error
        }
        throw new Error(`Failed to switch network: ${switchError.message}`)
      }
    }
  } catch (error: any) {
    // If error is about network switch rejection, throw it
    if (error.message?.includes('rejected network switch') || error.code === 4001) {
      throw error
    }
    // For other errors, check if we're actually on Polygon
    try {
      const network = await provider.getNetwork()
      if (Number(network.chainId) === POLYGON_CHAIN_ID) {
        return // Actually on Polygon, ignore the error
      }
    } catch {
      // If we can't check, throw the original error
    }
    throw error
  }
}

/**
 * Get browser provider (MetaMask, Phantom, etc.)
 */
export function getBrowserProvider(): ethers.BrowserProvider | null {
  if (typeof window === 'undefined') return null

  // Check for MetaMask or other EIP-1193 providers
  if (window.ethereum) {
    return new ethers.BrowserProvider(window.ethereum)
  }

  // Check for Phantom
  if ((window as any).phantom?.ethereum) {
    return new ethers.BrowserProvider((window as any).phantom.ethereum)
  }

  return null
}

