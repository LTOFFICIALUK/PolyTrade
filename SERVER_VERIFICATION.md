# Server Verification Guide

## Quick Start

### Step 1: Install WebSocket Package
```bash
npm install ws --save-dev
```

### Step 2: Start WebSocket Server
In Terminal 1:
```bash
npm run test:server
```

You should see:
```
WebSocket server listening on ws://localhost:8080
HTTP server listening on http://localhost:8081
```

### Step 3: Start Next.js Dev Server
In Terminal 2:
```bash
npm run dev
```

### Step 4: Verify Servers Are Running

#### Check WebSocket Server
```bash
curl http://localhost:8081/api/balance?address=0x1234567890123456789012345678901234567890
```

Expected response:
```json
{"success":true,"data":{"portfolioValue":5234.5,"cashBalance":1234.5,"totalValue":6469,"lastUpdated":"..."}}
```

#### Check Next.js Server
```bash
curl http://localhost:3000/api/user/balance?address=0x1234567890123456789012345678901234567890
```

Expected response:
```json
{"portfolioValue":5234.5,"cashBalance":1234.5,"totalValue":6469,"lastUpdated":"..."}
```

## Test All Routes

Run the test script:
```bash
npm run test:routes
```

Or manually test each route:

### User Routes
```bash
# Balance
curl "http://localhost:3000/api/user/balance?address=0x1234567890123456789012345678901234567890"

# Positions
curl "http://localhost:3000/api/user/positions?address=0x1234567890123456789012345678901234567890"

# Orders
curl "http://localhost:3000/api/user/orders?address=0x1234567890123456789012345678901234567890"

# History
curl "http://localhost:3000/api/user/history?address=0x1234567890123456789012345678901234567890&limit=10&offset=0"
```

### Polymarket Routes
```bash
# Market Search
curl "http://localhost:3000/api/polymarket/market-search?pair=BTC&timeframe=15m"

# Market Details
curl "http://localhost:3000/api/polymarket/market-details?id=test"

# Prices
curl "http://localhost:3000/api/polymarket/prices?tokenId=test"

# Orderbook
curl "http://localhost:3000/api/polymarket/orderbook?tokenId=test"

# Price History
curl "http://localhost:3000/api/polymarket/price-history?tokenId=test"

# Spreads
curl "http://localhost:3000/api/polymarket/spreads?tokenId=test"
```

## Environment Variables

Create `.env.local`:
```env
NEXT_PUBLIC_WEBSOCKET_SERVER_URL=ws://localhost:8080
WEBSOCKET_SERVER_HTTP_URL=http://localhost:8081
```

## Troubleshooting

### Port Already in Use
```bash
# Kill processes on ports
lsof -ti:8080 | xargs kill -9
lsof -ti:8081 | xargs kill -9
lsof -ti:3000 | xargs kill -9
```

### WebSocket Server Not Starting
- Check if `ws` package is installed: `npm list ws`
- Check for errors in terminal output
- Verify ports 8080 and 8081 are free

### Next.js Routes Returning Errors
- Make sure Next.js dev server is running
- Check browser console for errors
- Verify environment variables are set
- Check that WebSocket server is running (routes fallback to mock data if not)

### WebSocket Connection in Browser
- Open browser DevTools → Console
- Look for WebSocket connection messages
- Check Network tab → WS filter for WebSocket connections
- Verify `NEXT_PUBLIC_WEBSOCKET_SERVER_URL` is set correctly

## Expected Behavior

### When WebSocket Server is Running:
- User routes (`/api/user/*`) will query the WebSocket server
- Real-time updates via WebSocket connection
- HTTP endpoints available for server-side queries

### When WebSocket Server is NOT Running:
- User routes will fallback to mock data
- No real-time updates
- Routes still return 200 OK with mock data

### Polymarket Routes:
- Always query Polymarket API directly
- May return errors if Polymarket API is down
- No fallback data (returns error response)

## Production Setup

Replace `server/test-websocket-server.js` with your production server that:
1. Connects to Polymarket WebSocket
2. Stores data in a database
3. Handles authentication
4. Exposes secure HTTP endpoints

