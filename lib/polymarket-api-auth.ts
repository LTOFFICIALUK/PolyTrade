/**
 * Polymarket API Authentication Utilities (L2)
 * Handles HMAC signing for authenticated API requests using API credentials
 * 
 * Based on official py-clob-client implementation:
 * https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/signing/hmac.py
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
  [key: string]: string
}

/**
 * Convert URL-safe base64 to standard base64
 */
function urlSafeBase64ToStandard(urlSafe: string): string {
  return urlSafe.replace(/-/g, '+').replace(/_/g, '/')
}

/**
 * Convert standard base64 to URL-safe base64
 */
function standardBase64ToUrlSafe(standard: string): string {
  return standard.replace(/\+/g, '-').replace(/\//g, '_')
}

/**
 * Generate HMAC signature for Polymarket API request
 * Matches the official py-clob-client implementation exactly
 */
function buildHmacSignature(
  secret: string,
  timestamp: string,
  method: string,
  requestPath: string,
  body: string | null
): string {
  // Decode the URL-safe base64 secret
  const base64Secret = urlSafeBase64ToStandard(secret)
  const secretBuffer = Buffer.from(base64Secret, 'base64')
  
  // Build the message: timestamp + method + requestPath + body
  let message = timestamp + method + requestPath
  if (body) {
    message += body
  }
  
  console.log('[HMAC] Building signature:', {
    timestamp,
    method,
    requestPath,
    bodyLength: body?.length || 0,
    messagePreview: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
  })
  
  // Create HMAC SHA256 signature
  const hmac = crypto.createHmac('sha256', secretBuffer)
  hmac.update(message, 'utf-8')
  
  // Return URL-safe base64 encoded signature
  const signature = standardBase64ToUrlSafe(hmac.digest('base64'))
  
  console.log('[HMAC] Generated signature:', signature.substring(0, 20) + '...')
  
  return signature
}

/**
 * Generate L2 authentication headers for Polymarket API requests
 * Uses HMAC signature with API credentials
 * 
 * Based on official py-clob-client implementation:
 * https://github.com/Polymarket/py-clob-client/blob/main/py_clob_client/signing/hmac.py
 */
export function generatePolymarketAuthHeaders(
  method: string,
  path: string,
  body: string | null,
  walletAddress: string,
  credentials: PolymarketApiCredentials
): PolymarketAuthHeaders {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  
  const signature = buildHmacSignature(
    credentials.secret,
    timestamp,
    method,
    path,
    body
  )

  // Use lowercase address for POLY_ADDRESS header (matching py-clob-client behavior)
  // The API expects a consistent address format
  const normalizedAddress = walletAddress.toLowerCase()

  // Headers use underscores as per official py-clob-client
  return {
    'POLY_ADDRESS': normalizedAddress,
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
  
  const authHeaders = generatePolymarketAuthHeaders(
    method,
    path,
    bodyString,
    walletAddress,
    credentials
  )

  // Headers use underscores as per official py-clob-client implementation
  // Add browser-like headers to bypass Cloudflare bot protection
  const requestHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
    // Browser-like headers to bypass Cloudflare bot protection
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Origin': 'https://clob.polymarket.com',
    'Referer': 'https://clob.polymarket.com/',
    // Polymarket authentication headers
    'POLY_ADDRESS': authHeaders['POLY_ADDRESS'],
    'POLY_SIGNATURE': authHeaders['POLY_SIGNATURE'],
    'POLY_TIMESTAMP': authHeaders['POLY_TIMESTAMP'],
    'POLY_API_KEY': authHeaders['POLY_API_KEY'],
    'POLY_PASSPHRASE': authHeaders['POLY_PASSPHRASE'],
  }

  console.log('[Polymarket API] Making request:', {
    method,
    url,
    path,
    walletAddress: walletAddress.substring(0, 10) + '...',
    hasBody: !!bodyString,
    headers: {
      POLY_ADDRESS: requestHeaders['POLY_ADDRESS'],
      POLY_TIMESTAMP: requestHeaders['POLY_TIMESTAMP'],
      POLY_API_KEY: (requestHeaders['POLY_API_KEY'] as string).substring(0, 10) + '...',
      'User-Agent': (requestHeaders['User-Agent'] as string).substring(0, 50) + '...',
    }
  })

  return fetch(url, {
    method,
    headers: requestHeaders,
    body: bodyString || undefined,
  })
}

