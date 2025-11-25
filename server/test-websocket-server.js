/**
 * WebSocket server that fetches real data from Polymarket APIs and Polygon blockchain
 */

const WebSocket = require('ws')
const http = require('http')
const { ethers } = require('ethers')

const PORT = process.env.PORT || 8080
const HTTP_PORT = process.env.HTTP_PORT || 8081

// Polygon RPC endpoint
const POLYGON_RPC = process.env.POLYGON_RPC || 'https://polygon-rpc.com'
const POLYMARKET_CLOB_API = 'https://clob.polymarket.com'
const POLYMARKET_API = 'https://api.polymarket.com'
const POLYMARKET_DATA_API = 'https://data-api.polymarket.com'
const POLYMARKET_CLOB_WS = 'wss://ws-subscriptions-clob.polymarket.com/ws/'
const POLYMARKET_RTDS_WS = 'wss://ws-live-data.polymarket.com'

// Initialize Polygon provider
const provider = new ethers.JsonRpcProvider(POLYGON_RPC)

// Cache for API responses (5 second TTL)
const cache = new Map()
const CACHE_TTL = 5000

// Helper to get cached or fetch data
async function getCachedOrFetch(key, fetchFn) {
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }
  const data = await fetchFn()
  cache.set(key, { data, timestamp: Date.now() })
  return data
}

// Fetch user's token balances from Polymarket Data API
async function fetchUserPositions(address) {
  try {
    // Use Polymarket Data API for user holdings
    const response = await fetch(`${POLYMARKET_DATA_API}/users/${address}/holdings`, {
      headers: {
        'Accept': 'application/json',
      },
    })
    
    let positions = []
    let cashBalance = 0
    
    if (response.ok) {
      const data = await response.json()
      // Parse holdings data from Polymarket
      if (Array.isArray(data)) {
        positions = data.map(holding => ({
          tokenId: holding.token_id || holding.conditionId,
          market: holding.market || holding.question,
          side: holding.side || 'YES',
          shares: parseFloat(holding.balance || holding.amount || 0),
          avgPrice: parseFloat(holding.avgPrice || 0),
          currentPrice: parseFloat(holding.currentPrice || 0),
          pnl: parseFloat(holding.pnl || 0),
        }))
      }
    } else {
      console.log(`Data API returned ${response.status}, falling back to blockchain query`)
      // Fallback to blockchain query for USDC
      const usdcAddress = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
      const usdcAbi = ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)']
      const usdcContract = new ethers.Contract(usdcAddress, usdcAbi, provider)
      const [usdcBalance, decimals] = await Promise.all([
        usdcContract.balanceOf(address).catch(() => ethers.parseUnits('0', 6)),
        usdcContract.decimals().catch(() => 6)
      ])
      cashBalance = parseFloat(ethers.formatUnits(usdcBalance, decimals))
    }
    
    return { positions, cashBalance }
  } catch (error) {
    console.error('Error fetching positions:', error)
    return { positions: [], cashBalance: 0 }
  }
}

// Fetch user's open orders from Polymarket CLOB API
async function fetchUserOrders(address) {
  try {
    // CLOB API endpoint for user orders
    const response = await fetch(`${POLYMARKET_CLOB_API}/orders?maker=${address}`, {
      headers: {
        'Accept': 'application/json',
      },
    })
    
    if (!response.ok) {
      // Try alternative endpoint format
      const altResponse = await fetch(`${POLYMARKET_CLOB_API}/users/${address}/orders`, {
        headers: {
          'Accept': 'application/json',
        },
      })
      if (altResponse.ok) {
        const data = await altResponse.json()
        return Array.isArray(data) ? data : (data.orders || [])
      }
      throw new Error(`CLOB API error: ${response.status}`)
    }
    
    const data = await response.json()
    // Handle different response formats
    if (Array.isArray(data)) {
      return data
    } else if (data.orders && Array.isArray(data.orders)) {
      return data.orders
    } else if (data.data && Array.isArray(data.data)) {
      return data.data
    }
    return []
  } catch (error) {
    console.error('Error fetching orders:', error)
    return []
  }
}

// Calculate portfolio value from positions
async function calculatePortfolioValue(positions) {
  let totalValue = 0
  
  for (const position of positions) {
    try {
      // Get current price for each token
      const priceResponse = await fetch(`${POLYMARKET_API}/pricing/market-price?token_id=${position.tokenId}`)
      if (priceResponse.ok) {
        const priceData = await priceResponse.json()
        const currentPrice = parseFloat(priceData.price || 0)
        totalValue += position.shares * currentPrice
      }
    } catch (error) {
      console.error(`Error fetching price for ${position.tokenId}:`, error)
    }
  }
  
  return totalValue
}

// Fetch user balance
async function fetchUserBalance(address) {
  try {
    const { positions, cashBalance } = await fetchUserPositions(address)
    const portfolioValue = await calculatePortfolioValue(positions)
    
    return {
      portfolioValue,
      cashBalance,
      totalValue: portfolioValue + cashBalance,
      lastUpdated: new Date().toISOString(),
    }
  } catch (error) {
    console.error('Error fetching balance:', error)
    return {
      portfolioValue: 0,
      cashBalance: 0,
      totalValue: 0,
      lastUpdated: new Date().toISOString(),
    }
  }
}

// Fetch trade history from Polymarket Data API
async function fetchTradeHistory(address, limit = 100, offset = 0) {
  try {
    // Use Polymarket Data API for trade history
    const response = await fetch(`${POLYMARKET_DATA_API}/users/${address}/trades?limit=${limit}&offset=${offset}`, {
      headers: {
        'Accept': 'application/json',
      },
    })
    
    if (response.ok) {
      const data = await response.json()
      // Parse trade history data
      if (Array.isArray(data)) {
        return data.map(trade => ({
          tradeId: trade.trade_id || trade.id,
          tokenId: trade.token_id || trade.conditionId,
          market: trade.market || trade.question,
          side: trade.side || trade.type,
          shares: parseFloat(trade.amount || trade.shares || 0),
          price: parseFloat(trade.price || 0),
          timestamp: trade.timestamp || trade.created_at || new Date().toISOString(),
          outcome: trade.outcome || 'IN_PROGRESS',
          pnl: parseFloat(trade.pnl || 0),
        }))
      } else if (data.trades && Array.isArray(data.trades)) {
        return data.trades
      }
    }
    
    // Fallback: return empty array if API not available
    return []
  } catch (error) {
    console.error('Error fetching trade history:', error)
    return []
  }
}

// WebSocket Server for client connections
const wss = new WebSocket.Server({ port: PORT })

// Connect to Polymarket RTDS for real-time price updates
let polymarketRTDS = null
function connectToPolymarketRTDS() {
  try {
    polymarketRTDS = new WebSocket(POLYMARKET_RTDS_WS)
    
    polymarketRTDS.on('open', () => {
      console.log('Connected to Polymarket RTDS')
    })
    
    polymarketRTDS.on('message', (data) => {
      // Forward price updates to subscribed clients
      try {
        const message = JSON.parse(data.toString())
        // Broadcast to all connected clients subscribed to prices
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN && client._subscribedTopics?.has('prices')) {
            client.send(JSON.stringify({
              topic: 'prices',
              payload: message,
            }))
          }
        })
      } catch (error) {
        console.error('Error parsing RTDS message:', error)
      }
    })
    
    polymarketRTDS.on('error', (error) => {
      console.error('Polymarket RTDS error:', error)
    })
    
    polymarketRTDS.on('close', () => {
      console.log('Polymarket RTDS disconnected, reconnecting...')
      setTimeout(connectToPolymarketRTDS, 5000)
    })
  } catch (error) {
    console.error('Failed to connect to Polymarket RTDS:', error)
  }
}

// Connect to Polymarket RTDS on startup
connectToPolymarketRTDS()

wss.on('connection', (ws) => {
  console.log('WebSocket client connected')
  ws._subscribedTopics = new Set()

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString())
      console.log('Received:', data)

      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }))
        return
      }

      if (data.type === 'subscribe') {
        const { topic, address } = data
        const userAddress = address || testAddress
        ws._subscribedTopics.add(topic)
        
        if (topic === 'balance') {
          fetchUserBalance(userAddress).then(balance => {
            ws.send(JSON.stringify({
              topic: 'balance',
              payload: balance,
            }))
          })
        } else if (topic === 'positions') {
          fetchUserPositions(userAddress).then(({ positions }) => {
            ws.send(JSON.stringify({
              topic: 'positions',
              payload: positions,
            }))
          })
        } else if (topic === 'orders') {
          fetchUserOrders(userAddress).then(orders => {
            ws.send(JSON.stringify({
              topic: 'orders',
              payload: orders,
            }))
          })
        }

        // Real-time updates every 5 seconds
        const interval = setInterval(async () => {
          if (ws.readyState === WebSocket.OPEN) {
            if (topic === 'balance') {
              const balance = await fetchUserBalance(userAddress)
              ws.send(JSON.stringify({
                topic: 'balance',
                payload: balance,
              }))
            } else if (topic === 'positions') {
              const { positions } = await fetchUserPositions(userAddress)
              ws.send(JSON.stringify({
                topic: 'positions',
                payload: positions,
              }))
            } else if (topic === 'orders') {
              const orders = await fetchUserOrders(userAddress)
              ws.send(JSON.stringify({
                topic: 'orders',
                payload: orders,
              }))
            }
          } else {
            clearInterval(interval)
          }
        }, 5000) // Update every 5 seconds

        ws._intervals = ws._intervals || []
        ws._intervals.push(interval)
      }

      if (data.type === 'unsubscribe') {
        const { topic } = data
        ws._subscribedTopics.delete(topic)
        // Clear intervals for this topic
        if (ws._intervals) {
          ws._intervals.forEach(clearInterval)
          ws._intervals = []
        }
      }
    } catch (error) {
      console.error('Error processing message:', error)
    }
  })

  ws.on('close', () => {
    console.log('WebSocket client disconnected')
    if (ws._intervals) {
      ws._intervals.forEach(clearInterval)
    }
    ws._subscribedTopics.clear()
  })

  ws.on('error', (error) => {
    console.error('WebSocket error:', error)
  })
})

// HTTP Server for REST API
const httpServer = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  const url = new URL(req.url, `http://${req.headers.host}`)
  const path = url.pathname
  const address = url.searchParams.get('address')

  if (!address) {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ success: false, error: 'Missing address parameter' }))
    return
  }

  try {
    if (path === '/api/balance') {
      const balance = await getCachedOrFetch(`balance:${address}`, () => fetchUserBalance(address))
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true, data: balance }))
    } else if (path === '/api/positions') {
      const { positions } = await fetchUserPositions(address)
      const cachedPositions = await getCachedOrFetch(`positions:${address}`, async () => {
        const { positions } = await fetchUserPositions(address)
        return positions
      })
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true, data: cachedPositions }))
    } else if (path === '/api/orders') {
      const orders = await getCachedOrFetch(`orders:${address}`, () => fetchUserOrders(address))
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true, data: orders }))
    } else if (path === '/api/history') {
      const limit = parseInt(url.searchParams.get('limit') || '100')
      const offset = parseInt(url.searchParams.get('offset') || '0')
      const history = await fetchTradeHistory(address, limit, offset)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true, data: history }))
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: false, error: 'Not found' }))
    }
  } catch (error) {
    console.error(`Error handling ${path}:`, error)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ success: false, error: error.message }))
  }
})

httpServer.listen(HTTP_PORT, () => {
  console.log(`HTTP server listening on http://localhost:${HTTP_PORT}`)
})

wss.on('listening', () => {
  console.log(`WebSocket server listening on ws://localhost:${PORT}`)
  console.log(`HTTP server listening on http://localhost:${HTTP_PORT}`)
  console.log('\nServer is ready!')
  console.log('Fetching real data from Polymarket APIs and Polygon blockchain')
})

