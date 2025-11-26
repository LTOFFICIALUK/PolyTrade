/**
 * Server-side utility for communicating with the WebSocket server
 * The WebSocket server should expose HTTP endpoints for server-side API routes
 */

const WEBSOCKET_SERVER_HTTP_URL = process.env.WEBSOCKET_SERVER_HTTP_URL || 
  (process.env.WEBSOCKET_SERVER_URL 
    ? process.env.WEBSOCKET_SERVER_URL.replace('ws://', 'http://').replace('wss://', 'https://')
    : 'http://localhost:8081')

export interface WebSocketServerResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Make an HTTP request to the WebSocket server
 * The server should expose REST endpoints for server-side access
 */
export async function queryWebSocketServer<T = any>(
  endpoint: string,
  options?: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    body?: any
    params?: Record<string, string>
  }
): Promise<T> {
  const { method = 'GET', body, params } = options || {}
  
  let url = `${WEBSOCKET_SERVER_HTTP_URL}${endpoint}`
  
  if (params && method === 'GET') {
    const searchParams = new URLSearchParams(params)
    url += `?${searchParams.toString()}`
  }

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`WebSocket server error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const data = await response.json()
    
    // Handle both wrapped response format and direct data
    if (data && typeof data === 'object' && 'success' in data) {
      // Wrapped response format: { success: true, data: {...} }
      if (!data.success) {
        throw new Error(data.error || 'Unknown error from WebSocket server')
      }
      return data.data as T
    } else {
      // Direct data format: {...}
      return data as T
    }
  } catch (error: any) {
    console.error(`Error querying WebSocket server at ${endpoint}:`, error)
    throw error
  }
}

/**
 * Get user balance from WebSocket server
 */
export async function getUserBalance(walletAddress: string) {
  return queryWebSocketServer('/api/balance', {
    method: 'GET',
    params: { address: walletAddress },
  })
}

/**
 * Get user positions from WebSocket server
 */
export async function getUserPositions(walletAddress: string) {
  return queryWebSocketServer('/api/positions', {
    method: 'GET',
    params: { address: walletAddress },
  })
}

/**
 * Get user orders from WebSocket server
 */
export async function getUserOrders(walletAddress: string) {
  return queryWebSocketServer('/api/orders', {
    method: 'GET',
    params: { address: walletAddress },
  })
}

/**
 * Get user trade history from WebSocket server
 */
export async function getUserHistory(walletAddress: string, limit?: number, offset?: number) {
  return queryWebSocketServer('/api/history', {
    method: 'GET',
    params: {
      address: walletAddress,
      ...(limit && { limit: limit.toString() }),
      ...(offset && { offset: offset.toString() }),
    },
  })
}

