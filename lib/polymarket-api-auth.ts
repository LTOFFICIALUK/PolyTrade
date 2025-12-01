/**
 * Polymarket API Authentication Utilities (L2)
 * Handles HMAC signing for authenticated API requests using API credentials
 */

import crypto from 'crypto'

export interface PolymarketApiCredentials {
  apiKey: string
  secret: string
  passphrase: string
}

export interface PolymarketAuthHeaders {
  'POLY_ADDRESS': string
  'POLY_SIGNATURE': string
  'POLY_TIMESTAMP': string
  'POLY_API_KEY': string
  'POLY_PASSPHRASE': string
}

/**
 * Generate HMAC signature for Polymarket API request
 * Based on Polymarket's L2 authentication requirements
 */
function generateHmacSignature(
  method: string,
  path: string,
  body: string | null,
  timestamp: string,
  secret: string
): string {
  // Create the message to sign
  // Format: timestamp + method + path + (body if exists)
  const message = timestamp + method.toUpperCase() + path + (body || '')
  
  // Create HMAC SHA256 signature
  const hmac = crypto.createHmac('sha256', Buffer.from(secret, 'base64'))
  hmac.update(message)
  return hmac.digest('base64')
}

/**
 * Generate authentication headers for Polymarket API requests (L2)
 */
export function generatePolymarketAuthHeaders(
  method: string,
  path: string,
  body: string | null,
  walletAddress: string,
  credentials: PolymarketApiCredentials
): PolymarketAuthHeaders {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  
  const signature = generateHmacSignature(
    method,
    path,
    body,
    timestamp,
    credentials.secret
  )

  return {
    'POLY_ADDRESS': walletAddress,
    'POLY_SIGNATURE': signature,
    'POLY_TIMESTAMP': timestamp,
    'POLY_API_KEY': credentials.apiKey,
    'POLY_PASSPHRASE': credentials.passphrase,
  }
}

/**
 * Make authenticated request to Polymarket CLOB API
 */
export async function makeAuthenticatedRequest(
  method: string,
  path: string,
  walletAddress: string,
  credentials: PolymarketApiCredentials,
  body?: any
): Promise<Response> {
  const POLYMARKET_CLOB_API = 'https://clob.polymarket.com'
  const url = `${POLYMARKET_CLOB_API}${path}`
  
  const bodyString = body ? JSON.stringify(body) : null
  
  const headers = generatePolymarketAuthHeaders(
    method,
    path,
    bodyString,
    walletAddress,
    credentials
  )

  const requestHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...headers,
  }

  return fetch(url, {
    method,
    headers: requestHeaders,
    body: bodyString || undefined,
  })
}

