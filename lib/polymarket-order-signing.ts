/**
 * Polymarket Order Signing Utilities
 * Handles EIP-712 signing for Polymarket CLOB orders
 * 
 * Based on official Polymarket SDKs:
 * - Python: https://github.com/Polymarket/py-clob-client
 * - TypeScript: https://github.com/Polymarket/clob-client
 * 
 * Documentation: https://docs.polymarket.com/developers/CLOB/orders/orders
 */

import { ethers } from 'ethers'

const POLYGON_CHAIN_ID = 137

// Polymarket Operator address - this is the address that can fill orders
// For Polymarket's exchange, this is their operator contract
const POLYMARKET_OPERATOR = '0xC5d563A36AE78145C45a50134d48A1215220f80a'

// Polymarket CTF Exchange contracts on Polygon
// See: https://docs.polymarket.com/developers/conditional-token-frameworks/deployment-and-additional-information
const CTF_EXCHANGE_ADDRESS = '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E' // Regular CTF Exchange
const NEG_RISK_CTF_EXCHANGE_ADDRESS = '0xC5d563A36AE78145C45a50134d48A1215220f80a' // Neg-Risk CTF Exchange

// Order side enum - must match the contract's Side enum
export enum OrderSide {
  BUY = 0,
  SELL = 1,
}

// Signature type enum - determines how the signature is verified
// See: https://docs.polymarket.com/developers/CLOB/orders/orders#signature-types
export enum SignatureType {
  EOA = 0,              // Direct EOA signature (EIP-712)
  POLY_PROXY = 1,       // Polymarket Proxy wallet (Email/Magic login)
  POLY_GNOSIS_SAFE = 2, // Polymarket Gnosis Safe wallet (Browser wallet login)
}

// Order type enum for API
export enum OrderType {
  GTC = 'GTC', // Good-Til-Cancelled
  GTD = 'GTD', // Good-Til-Date
  FOK = 'FOK', // Fill-Or-Kill (market order, must fill entirely)
  FAK = 'FAK', // Fill-And-Kill (market order, partial fill ok)
}

export interface OrderParams {
  tokenId: string
  side: OrderSide
  price: number // Price in decimal (e.g., 0.50 for 50 cents)
  size: number // Size in shares
  maker: string // Funder address (the wallet that holds the funds)
  signer: string // Signing address (the EOA that signs the order)
  expiration?: number // Unix timestamp (for GTD orders)
  nonce?: string // Exchange nonce (optional, will be fetched if not provided)
  negRisk?: boolean // Whether this is a neg-risk market
  feeRateBps?: string // Fee rate in basis points (default: "0")
}

export interface SignedOrder {
  salt: string
  maker: string
  signer: string
  taker: string
  tokenId: string
  makerAmount: string
  takerAmount: string
  expiration: string
  nonce: string
  feeRateBps: string
  side: string // "BUY" or "SELL" for API, but numeric for EIP-712 signing
  signatureType: number
  signature: string
}

/**
 * Get exchange nonce for a maker address
 * Uses our server-side API proxy to avoid CORS issues
 */
export async function getExchangeNonce(maker: string): Promise<string> {
  try {
    // Use our server-side proxy to avoid CORS issues
    const response = await fetch(`/api/polymarket/nonce?maker=${maker}`)
    if (!response.ok) {
      // Default to 0 if nonce endpoint fails
      return '0'
    }
    const data = await response.json()
    return data.nonce?.toString() || '0'
  } catch (error) {
    console.warn('Failed to fetch exchange nonce, using 0:', error)
    return '0'
  }
}

/**
 * Calculate maker and taker amounts based on price and size
 * Polymarket uses 6 decimals (1e6) for ALL amounts - both USDC and conditional tokens
 * Based on py-clob-client's to_token_decimals() function
 */
function calculateAmounts(
  side: OrderSide,
  price: number,
  size: number
): { makerAmount: string; takerAmount: string } {
  // Price is in decimal (e.g., 0.50 for 50 cents)
  // Size is in shares
  // Both amounts use 6 decimals (1e6) as per Polymarket standard
  //
  // IMPORTANT: Polymarket requires specific precision:
  // - BUY: makerAmount (USDC) max 4 decimals, takerAmount (tokens) max 2 decimals
  // - SELL: makerAmount (tokens) max 2 decimals, takerAmount (USDC) max 4 decimals
  
  const TOKEN_DECIMALS = 1e6 // Polymarket uses 6 decimals for everything
  
  if (side === OrderSide.BUY) {
    // Buying: maker pays USDC, receives tokens
    // makerAmount = price * size (what you pay in USDC) - max 4 decimals
    // takerAmount = size (what you receive in tokens) - max 2 decimals
    const rawTakerAmount = Math.floor(size * 100) / 100 // Round to 2 decimals
    const rawMakerAmount = Math.floor(rawTakerAmount * price * 10000) / 10000 // Round to 4 decimals
    
    const makerAmount = Math.floor(rawMakerAmount * TOKEN_DECIMALS).toString()
    const takerAmount = Math.floor(rawTakerAmount * TOKEN_DECIMALS).toString()
    
    return { makerAmount, takerAmount }
  } else {
    // Selling: maker pays tokens, receives USDC
    // makerAmount = size (what you sell in tokens) - max 2 decimals
    // takerAmount = price * size (what you receive in USDC) - max 4 decimals
    const rawMakerAmount = Math.floor(size * 100) / 100 // Round to 2 decimals
    const rawTakerAmount = Math.floor(rawMakerAmount * price * 10000) / 10000 // Round to 4 decimals
    
    const makerAmount = Math.floor(rawMakerAmount * TOKEN_DECIMALS).toString()
    const takerAmount = Math.floor(rawTakerAmount * TOKEN_DECIMALS).toString()
    
    return { makerAmount, takerAmount }
  }
}

/**
 * Create and sign a Polymarket order using EIP-712
 * 
 * The order structure must match exactly what the Polymarket CTF Exchange contract expects.
 * See: https://docs.polymarket.com/developers/CLOB/orders/create-order
 */
export async function createSignedOrder(
  params: OrderParams,
  provider: ethers.BrowserProvider,
  signatureType: SignatureType = SignatureType.EOA
): Promise<SignedOrder> {
  const {
    tokenId,
    side,
    price,
    size,
    maker,
    signer,
    expiration,
    nonce: providedNonce,
    negRisk = false,
    feeRateBps: providedFeeRateBps,
  } = params

  // Validate inputs
  if (!tokenId || price <= 0 || size <= 0 || !maker || !signer) {
    throw new Error('Invalid order parameters')
  }

  // Validate price is within valid range (0 to 1 in decimal, or 0 to 100 in cents)
  if (price < 0 || price > 1) {
    throw new Error('Price must be between 0 and 1 (e.g., 0.50 for 50 cents)')
  }

  // Get signer from provider
  const walletSigner = await provider.getSigner()
  const signerAddress = await walletSigner.getAddress()

  // Ensure signer matches
  if (signerAddress.toLowerCase() !== signer.toLowerCase()) {
    throw new Error('Signer address mismatch')
  }

  // Generate salt matching the official SDK's format
  // The SDK uses: Math.round(Math.random() * Date.now())
  // This produces a ~15 digit number that fits safely in JavaScript's number type
  // AND can be parsed correctly by parseInt() when sent to the API
  // Despite uint256 being 256-bit, the SDK uses small salts for JSON compatibility
  const salt = Math.round(Math.random() * Date.now())
  const saltBigInt = BigInt(salt)

  // Get exchange nonce if not provided
  const nonce = providedNonce || (await getExchangeNonce(maker))

  // Set expiration based on order type:
  // - For GTC/FOK/FAK orders: expiration MUST be '0' (no expiration)
  // - For GTD orders: user provides the expiration timestamp
  // The API will reject non-zero expiration for non-GTD orders
  const expirationTimestamp = expiration || 0

  // Calculate amounts based on side, price, and size
  const { makerAmount, takerAmount } = calculateAmounts(side, price, size)

  // Fee rate in basis points (0 = no fee, 100 = 1%)
  // Polymarket operator may require a fee rate
  const feeRateBps = providedFeeRateBps || '0'

  // Convert tokenId to BigInt for proper uint256 representation
  const tokenIdBigInt = BigInt(tokenId)
  
  // Determine which exchange contract to use based on neg-risk status
  const exchangeAddress = negRisk ? NEG_RISK_CTF_EXCHANGE_ADDRESS : CTF_EXCHANGE_ADDRESS
  
  console.log('[Order Signing] Creating order:', {
    negRisk,
    exchangeAddress,
    tokenId: tokenId.substring(0, 20) + '...',
    side: side === OrderSide.BUY ? 'BUY' : 'SELL',
    price,
    size,
    makerAmount,
    takerAmount,
  })
  
  // EIP-712 domain - must match the contract's domain separator exactly
  const domain = {
    name: 'Polymarket CTF Exchange',
    version: '1',
    chainId: POLYGON_CHAIN_ID,
    verifyingContract: exchangeAddress,
  }

  // EIP-712 types - the Order struct as defined in the CTF Exchange contract
  // Note: signatureType is NOT part of the signed data, it's added to the signature afterward
  const types = {
    Order: [
      { name: 'salt', type: 'uint256' },
      { name: 'maker', type: 'address' },
      { name: 'signer', type: 'address' },
      { name: 'taker', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
      { name: 'makerAmount', type: 'uint256' },
      { name: 'takerAmount', type: 'uint256' },
      { name: 'expiration', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'feeRateBps', type: 'uint256' },
      { name: 'side', type: 'uint8' },
      { name: 'signatureType', type: 'uint8' },
    ],
  }

  // Build the order object for signing
  // The taker address is typically set to zero address (anyone can fill)
  // or the operator's address for specific operator matching
  const orderForSigning = {
    salt: saltBigInt,
    maker: ethers.getAddress(maker),
    signer: ethers.getAddress(signer),
    taker: ethers.ZeroAddress, // Zero address means any taker can fill
    tokenId: tokenIdBigInt,
    makerAmount: BigInt(makerAmount),
    takerAmount: BigInt(takerAmount),
    expiration: BigInt(expirationTimestamp),
    nonce: BigInt(nonce),
    feeRateBps: BigInt(feeRateBps),
    side: side, // Numeric: 0 for BUY, 1 for SELL
    signatureType: signatureType,
  }

  // Sign the order using EIP-712 typed data signing
  const signature = await walletSigner.signTypedData(domain, types, orderForSigning)

  console.log('[Order Signing] Order signed successfully')

  // Return the signed order with all values as strings for JSON serialization
  // The API expects string representations of large integers
  return {
    salt: saltBigInt.toString(),
    maker: orderForSigning.maker,
    signer: orderForSigning.signer,
    taker: orderForSigning.taker,
    tokenId: tokenIdBigInt.toString(),
    makerAmount: makerAmount,
    takerAmount: takerAmount,
    expiration: expirationTimestamp.toString(),
    nonce: nonce.toString(),
    feeRateBps: feeRateBps,
    side: side === OrderSide.BUY ? 'BUY' : 'SELL',
    signatureType: signatureType,
    signature: signature,
  }
}

