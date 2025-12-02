/**
 * Polymarket Position Redemption
 * 
 * Redeems winning positions from resolved markets.
 * Uses the Gnosis Conditional Tokens contract.
 */

import { ethers } from 'ethers'

// Contract addresses on Polygon
const CONDITIONAL_TOKENS = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045'
const USDC_E = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'

// Conditional Tokens ABI (only the functions we need)
const CONDITIONAL_TOKENS_ABI = [
  'function redeemPositions(address collateralToken, bytes32 parentCollectionId, bytes32 conditionId, uint256[] calldata indexSets) external',
  'function balanceOf(address owner, uint256 id) view returns (uint256)',
  'function payoutNumerators(bytes32 conditionId, uint256 index) view returns (uint256)',
  'function payoutDenominator(bytes32 conditionId) view returns (uint256)',
]

export interface RedeemablePosition {
  conditionId: string
  outcomeIndex: number
  size: number
  title: string
  asset: string
}

/**
 * Get the index set for a given outcome index
 * For binary markets:
 * - Outcome 0 (Yes/Up) → indexSet = 1 (binary: 01)
 * - Outcome 1 (No/Down) → indexSet = 2 (binary: 10)
 */
function getIndexSet(outcomeIndex: number): number {
  return 1 << outcomeIndex
}

/**
 * Check if a position can be redeemed (market resolved and user won)
 */
export async function canRedeem(
  provider: ethers.Provider,
  conditionId: string,
  outcomeIndex: number
): Promise<boolean> {
  try {
    const contract = new ethers.Contract(CONDITIONAL_TOKENS, CONDITIONAL_TOKENS_ABI, provider)
    
    // Check if the condition has been resolved
    const denominator = await contract.payoutDenominator(conditionId)
    if (denominator === BigInt(0)) {
      console.log('[Redeem] Condition not yet resolved')
      return false
    }
    
    // Check if the user's outcome won
    const numerator = await contract.payoutNumerators(conditionId, outcomeIndex)
    const canRedeem = numerator > BigInt(0)
    
    console.log('[Redeem] Payout check:', { 
      conditionId: conditionId.slice(0, 10) + '...', 
      outcomeIndex, 
      numerator: numerator.toString(), 
      denominator: denominator.toString(),
      canRedeem 
    })
    
    return canRedeem
  } catch (error) {
    console.error('[Redeem] Error checking redemption:', error)
    return false
  }
}

/**
 * Redeem a winning position
 * 
 * @param provider - Ethers BrowserProvider with signer
 * @param conditionId - The market's condition ID
 * @param outcomeIndex - The outcome index (0 for Yes/Up, 1 for No/Down)
 * @returns Transaction hash
 */
export async function redeemPosition(
  provider: ethers.BrowserProvider,
  conditionId: string,
  outcomeIndex: number
): Promise<string> {
  console.log('[Redeem] Starting redemption...', { conditionId: conditionId.slice(0, 10) + '...', outcomeIndex })
  
  const signer = await provider.getSigner()
  const contract = new ethers.Contract(CONDITIONAL_TOKENS, CONDITIONAL_TOKENS_ABI, signer)
  
  // Parent collection ID is 0 for root conditions (most Polymarket markets)
  const parentCollectionId = ethers.ZeroHash
  
  // Calculate the index set for this outcome
  const indexSet = getIndexSet(outcomeIndex)
  
  console.log('[Redeem] Calling redeemPositions...', {
    collateralToken: USDC_E,
    parentCollectionId,
    conditionId,
    indexSets: [indexSet]
  })
  
  // Call redeemPositions
  const tx = await contract.redeemPositions(
    USDC_E,
    parentCollectionId,
    conditionId,
    [indexSet]
  )
  
  console.log('[Redeem] Transaction submitted:', tx.hash)
  
  // Wait for confirmation
  const receipt = await tx.wait()
  console.log('[Redeem] Transaction confirmed:', receipt.hash)
  
  return tx.hash
}

/**
 * Redeem multiple winning positions at once
 */
export async function redeemMultiplePositions(
  provider: ethers.BrowserProvider,
  positions: RedeemablePosition[]
): Promise<{ success: string[]; failed: string[] }> {
  const results = { success: [] as string[], failed: [] as string[] }
  
  for (const position of positions) {
    try {
      const txHash = await redeemPosition(provider, position.conditionId, position.outcomeIndex)
      results.success.push(txHash)
      console.log(`[Redeem] ✓ Redeemed ${position.title}`)
    } catch (error: any) {
      console.error(`[Redeem] ✗ Failed to redeem ${position.title}:`, error.message)
      results.failed.push(position.conditionId)
    }
  }
  
  return results
}

