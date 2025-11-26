# WebSocket Setup Guide

## Overview

PolyTrade uses a WebSocket connection to your separate WebSocket server for real-time data updates. The setup includes:

1. **Client-side WebSocket Context** - Manages WebSocket connections from the browser
2. **Server-side WebSocket Utility** - Allows API routes to query your WebSocket server via HTTP
3. **React Hooks** - Easy-to-use hooks for components to subscribe to real-time data

## Architecture

```
Browser (Client)                    WebSocket Server              Polymarket
     |                                    |                            |
     |-- WebSocket (wss://) ------------>|-- WebSocket ------------>|
     |                                    |                            |
     |-- HTTP API Routes ---------------->|-- HTTP Endpoints           |
     |                                    |                            |
     |                                    |-- Database (stores trades) |
```

## Client-Side Setup

### WebSocketProvider

The `WebSocketProvider` is already added to your app layout. It automatically:
- Connects to your WebSocket server
- Manages reconnection logic
- Handles subscriptions/unsubscriptions
- Caches latest data for each topic

### Environment Variables

Add to `.env.local`:
```env
NEXT_PUBLIC_WEBSOCKET_SERVER_URL=ws://localhost:8080
# or for production:
# NEXT_PUBLIC_WEBSOCKET_SERVER_URL=wss://your-websocket-server.com
```

### Using WebSocket in Components

#### Option 1: Using the hook (Recommended)

```tsx
import { useWebSocketData } from '@/hooks/useWebSocketData'

function MyComponent() {
  const { data, error, isConnected } = useWebSocketData({
    topic: 'balance',
    enabled: true,
  })

  if (!isConnected) return <div>Connecting...</div>
  if (error) return <div>Error: {error.message}</div>
  
  return <div>Balance: {data?.totalValue}</div>
}
```

#### Option 2: Using the context directly

```tsx
import { useWebSocket } from '@/contexts/WebSocketContext'

function MyComponent() {
  const { isConnected, subscribe, getLatestData } = useWebSocket()
  
  useEffect(() => {
    const unsubscribe = subscribe('prices', (data) => {
      console.log('Price update:', data)
    })
    
    return unsubscribe
  }, [subscribe])
  
  const latestPrice = getLatestData('prices')
  
  return <div>Connected: {isConnected ? 'Yes' : 'No'}</div>
}
```

## Server-Side Setup

### WebSocket Server Requirements

Your WebSocket server should expose:

1. **WebSocket Endpoint** (for real-time updates)
   - Accepts subscriptions: `{ type: 'subscribe', topic: 'balance' }`
   - Sends updates: `{ topic: 'balance', payload: {...} }`
   - Handles pings: `{ type: 'ping' }` → responds with `{ type: 'pong' }`

2. **HTTP REST Endpoints** (for API routes)
   - `GET /api/balance?address=0x...`
   - `GET /api/positions?address=0x...`
   - `GET /api/orders?address=0x...`
   - `GET /api/history?address=0x...&limit=100&offset=0`

### Environment Variables

Add to `.env.local`:
```env
WEBSOCKET_SERVER_URL=ws://localhost:8080
WEBSOCKET_SERVER_HTTP_URL=http://localhost:8080
```

## Available Topics

The WebSocket server should support these topics:

- `balance` - User portfolio balance updates
- `positions` - Open positions updates
- `orders` - Open orders updates
- `prices` - Real-time price updates (token prices)
- `trades` - New trade notifications
- `history` - Trade history updates

## Message Format

### Client → Server (Subscribe)
```json
{
  "type": "subscribe",
  "topic": "balance"
}
```

### Server → Client (Update)
```json
{
  "topic": "balance",
  "payload": {
    "portfolioValue": 5234.50,
    "cashBalance": 1234.50,
    "totalValue": 6469.00
  }
}
```

### Client → Server (Unsubscribe)
```json
{
  "type": "unsubscribe",
  "topic": "balance"
}
```

## API Routes Integration

The API routes (`/api/user/*`) automatically query your WebSocket server via HTTP. They include fallback mock data if the server is unavailable.

Example:
```typescript
// app/api/user/balance/route.ts
import { getUserBalance } from '@/lib/websocket-server'

const balance = await getUserBalance(walletAddress)
```

## Testing

1. Start your WebSocket server
2. Set environment variables
3. The WebSocket will automatically connect when the app loads
4. Check browser console for connection status
5. Use React DevTools to inspect WebSocket context state

## Troubleshooting

### Connection Issues
- Check `NEXT_PUBLIC_WEBSOCKET_SERVER_URL` is correct
- Verify WebSocket server is running
- Check browser console for errors
- Ensure CORS is configured on your WebSocket server

### No Data Updates
- Verify topic names match between client and server
- Check server is sending messages in correct format
- Use browser DevTools Network tab to inspect WebSocket messages

### API Routes Not Working
- Check `WEBSOCKET_SERVER_HTTP_URL` is set
- Verify HTTP endpoints are exposed on your server
- Check server logs for errors

