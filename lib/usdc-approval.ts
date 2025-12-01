/**
 * USDC Approval Utilities for Polymarket Trading
 * 
 * Before trading on Polymarket, users must approve the CTF Exchange
 * contract to spend their USDC. This module handles checking and
 * setting that approval.
 */

import { ethers } from 'ethers'

// USDC.e contract on Polygon - This is what Polymarket uses for collateral
// Note: Polymarket uses USDC.e (bridged), NOT native USDC from Circle
export const USDC_E = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' // USDC.e (Bridged)

// Polymarket CTF Exchange contracts
export const CTF_EXCHANGE = '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E'
export const NEG_RISK_CTF_EXCHANGE = '0xC5d563A36AE78145C45a50134d48A1215220f80a'

// Conditional Token (ERC1155) contract on Polygon
// This holds the position tokens (Yes/No shares)
export const CONDITIONAL_TOKENS = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045'

// ERC-20 ABI (minimal for approval)
const ERC20_ABI = [
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
]

// ERC-1155 ABI (for conditional token approval)
const ERC1155_ABI = [
  'function isApprovedForAll(address account, address operator) view returns (bool)',
  'function setApprovalForAll(address operator, bool approved)',
  'function balanceOf(address account, uint256 id) view returns (uint256)',
]

// Maximum uint256 for unlimited approval
const MAX_UINT256 = ethers.MaxUint256

export interface AllowanceStatus {
  usdce: {
    balance: number
    allowance: number
    needsApproval: boolean
  }
  // Keep these for backwards compatibility in UI
  nativeUsdc: {
    balance: number
    allowance: number
    needsApproval: boolean
  }
  bridgedUsdc: {
    balance: number
    allowance: number
    needsApproval: boolean
  }
  hasAnyBalance: boolean
  needsAnyApproval: boolean
}

// Status for conditional token (ERC1155) approval - needed for SELLING
export interface ConditionalTokenApprovalStatus {
  ctfApproved: boolean // Regular CTF Exchange approved
  negRiskApproved: boolean // Neg-Risk CTF Exchange approved
  needsApproval: boolean // True if either needs approval
}

/**
 * Check USDC.e allowance status for Polymarket trading
 * Polymarket uses USDC.e (bridged), not native USDC
 */
export async function checkUsdcAllowance(
  provider: ethers.BrowserProvider,
  walletAddress: string,
  spenderAddress: string = CTF_EXCHANGE
): Promise<AllowanceStatus> {
  const usdce = new ethers.Contract(USDC_E, ERC20_ABI, provider)

  const [balance, allowance] = await Promise.all([
    usdce.balanceOf(walletAddress),
    usdce.allowance(walletAddress, spenderAddress),
  ])

  // USDC.e has 6 decimals
  const balanceNum = Number(balance) / 1e6
  const allowanceNum = Number(allowance) / 1e6

  // Need approval if balance > 0 and allowance < balance
  const needsApproval = balanceNum > 0 && allowanceNum < balanceNum

  return {
    usdce: {
      balance: balanceNum,
      allowance: allowanceNum,
      needsApproval: needsApproval,
    },
    // For backwards compatibility with UI
    nativeUsdc: {
      balance: 0,
      allowance: 0,
      needsApproval: false,
    },
    bridgedUsdc: {
      balance: balanceNum,
      allowance: allowanceNum,
      needsApproval: needsApproval,
    },
    hasAnyBalance: balanceNum > 0,
    needsAnyApproval: needsApproval,
  }
}

/**
 * Approve USDC.e spending for the CTF Exchange
 * Polymarket uses USDC.e (bridged), not native USDC
 * Returns the transaction hash
 */
export async function approveUsdc(
  provider: ethers.BrowserProvider,
  _usdcType: 'native' | 'bridged' = 'bridged', // Parameter kept for compatibility but always uses USDC.e
  spenderAddress: string = CTF_EXCHANGE,
  amount: bigint = MAX_UINT256 // Default to unlimited approval
): Promise<string> {
  const signer = await provider.getSigner()
  const usdc = new ethers.Contract(USDC_E, ERC20_ABI, signer)

  console.log(`[USDC Approval] Approving USDC.e for ${spenderAddress}`)
  
  const tx = await usdc.approve(spenderAddress, amount)
  console.log(`[USDC Approval] Transaction submitted: ${tx.hash}`)
  
  // Wait for confirmation
  const receipt = await tx.wait()
  console.log(`[USDC Approval] Transaction confirmed in block ${receipt.blockNumber}`)
  
  return tx.hash
}

/**
 * Approve USDC.e for both exchanges (regular and neg-risk)
 */
export async function approveUsdcForBothExchanges(
  provider: ethers.BrowserProvider,
  _usdcType: 'native' | 'bridged' = 'bridged' // Parameter kept for compatibility but always uses USDC.e
): Promise<{ regularTx: string; negRiskTx: string }> {
  const regularTx = await approveUsdc(provider, 'bridged', CTF_EXCHANGE)
  const negRiskTx = await approveUsdc(provider, 'bridged', NEG_RISK_CTF_EXCHANGE)
  
  return { regularTx, negRiskTx }
}

/**
 * Sync on-chain allowance with Polymarket's system
 * This must be called after approving USDC on-chain
 * 
 * Polymarket's CLOB maintains its own balance/allowance tracking.
 * After approving on-chain, we need to call their API to update their records.
 */
export async function syncAllowanceWithPolymarket(
  walletAddress: string,
  credentials: {
    apiKey: string
    secret: string
    passphrase: string
  }
): Promise<{ collateral: boolean; conditional: boolean }> {
  console.log('[USDC Approval] Syncing allowance with Polymarket API...')
  
  const results = { collateral: false, conditional: false }
  
  try {
    // Call our API route to update balance allowance for COLLATERAL (USDC)
    const collateralResponse = await fetch('/api/polymarket/balance-allowance/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress,
        credentials,
        assetType: 'COLLATERAL',
      }),
    })
    
    if (collateralResponse.ok) {
      results.collateral = true
      console.log('[USDC Approval] Collateral allowance synced with Polymarket')
    } else {
      const error = await collateralResponse.json()
      console.warn('[USDC Approval] Failed to sync collateral allowance:', error)
    }
  } catch (error) {
    console.error('[USDC Approval] Error syncing collateral allowance:', error)
  }
  
  return results
}

/**
 * Check if conditional tokens are approved for selling
 * This checks if the CTF Exchange can transfer your position tokens (ERC1155)
 * Required for SELL orders
 */
export async function checkConditionalTokenApproval(
  provider: ethers.BrowserProvider,
  walletAddress: string
): Promise<ConditionalTokenApprovalStatus> {
  const ctf = new ethers.Contract(CONDITIONAL_TOKENS, ERC1155_ABI, provider)

  try {
    // Check approval for both exchanges on the main conditional tokens contract
    const [ctfApproved, negRiskCtfApproved] = await Promise.all([
      ctf.isApprovedForAll(walletAddress, CTF_EXCHANGE),
      ctf.isApprovedForAll(walletAddress, NEG_RISK_CTF_EXCHANGE),
    ])

    console.log('[CTF Approval] Status:', {
      ctfApproved,
      negRiskCtfApproved,
    })

    return {
      ctfApproved: ctfApproved,
      negRiskApproved: negRiskCtfApproved,
      needsApproval: !ctfApproved || !negRiskCtfApproved,
    }
  } catch (error) {
    console.error('[CTF Approval] Error checking approval:', error)
    // If we can't check, assume approval is needed
    return {
      ctfApproved: false,
      negRiskApproved: false,
      needsApproval: true,
    }
  }
}

/**
 * Approve conditional tokens for selling
 * This allows the CTF Exchange to transfer your position tokens
 * Required for SELL orders
 */
export async function approveConditionalTokens(
  provider: ethers.BrowserProvider
): Promise<{ txHashes: string[] }> {
  const signer = await provider.getSigner()
  const ctf = new ethers.Contract(CONDITIONAL_TOKENS, ERC1155_ABI, signer)
  
  const txHashes: string[] = []

  // Approve CTF Exchange for conditional tokens
  console.log('[CTF Approval] Approving CTF Exchange for conditional tokens...')
  const tx1 = await ctf.setApprovalForAll(CTF_EXCHANGE, true)
  console.log(`[CTF Approval] TX1 submitted: ${tx1.hash}`)
  await tx1.wait()
  txHashes.push(tx1.hash)

  // Approve Neg-Risk CTF Exchange for conditional tokens
  console.log('[CTF Approval] Approving Neg-Risk Exchange for conditional tokens...')
  const tx2 = await ctf.setApprovalForAll(NEG_RISK_CTF_EXCHANGE, true)
  console.log(`[CTF Approval] TX2 submitted: ${tx2.hash}`)
  await tx2.wait()
  txHashes.push(tx2.hash)

  console.log('[CTF Approval] All conditional token approvals complete:', txHashes)
  return { txHashes }
}

/**
 * Sync conditional token allowance with Polymarket
 * Called after approving conditional tokens on-chain
 */
export async function syncConditionalTokenAllowance(
  walletAddress: string,
  credentials: {
    apiKey: string
    secret: string
    passphrase: string
  }
): Promise<boolean> {
  console.log('[CTF Approval] Syncing conditional token allowance with Polymarket API...')
  
  try {
    const response = await fetch('/api/polymarket/balance-allowance/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress,
        credentials,
        assetType: 'CONDITIONAL',
      }),
    })
    
    if (response.ok) {
      console.log('[CTF Approval] Conditional token allowance synced with Polymarket')
      return true
    } else {
      const error = await response.json()
      console.warn('[CTF Approval] Failed to sync conditional token allowance:', error)
      return false
    }
  } catch (error) {
    console.error('[CTF Approval] Error syncing conditional token allowance:', error)
    return false
  }
}

