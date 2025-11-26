# Server Setup and Verification Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install ws --save-dev
```

### 2. Start the Test WebSocket Server
```bash
npm run test:server
```

This will start:
- WebSocket server on `ws://localhost:8080`
- HTTP server on `http://localhost:8081`

### 3. Start Next.js Dev Server
In a separate terminal:
```bash
npm run dev
```

### 4. Verify Everything is Working
```bash
npm run test:routes
```

Or use the verification script:
```bash
bash scripts/verify-setup.sh
```

## Server Details

### Test WebSocket Server (`server/test-websocket-server.js`)

A simple test server that provides:
- WebSocket connection on port 8080
- HTTP REST API on port 8081
- Mock data for testing

**Endpoints:**
- `GET http://localhost:8081/api/balance?address=0x...`
- `GET http://localhost:8081/api/positions?address=0x...`
- `GET http://localhost:8081/api/orders?address=0x...`
- `GET http://localhost:8081/api/history?address=0x...&limit=100&offset=0`

**Test Address:**
`0x1234567890123456789012345678901234567890`

### Environment Variables

Create `.env.local`:
```env
NEXT_PUBLIC_WEBSOCKET_SERVER_URL=ws://localhost:8080
WEBSOCKET_SERVER_HTTP_URL=http://localhost:8081
```

## API Routes to Test

### Polymarket Routes
- `/api/polymarket/market-search?pair=BTC&timeframe=15m`
- `/api/polymarket/market-details?id=...`
- `/api/polymarket/prices?tokenId=...`
- `/api/polymarket/orderbook?tokenId=...`
- `/api/polymarket/price-history?tokenId=...`
- `/api/polymarket/spreads?tokenId=...`

### User Routes
- `/api/user/balance?address=0x...`
- `/api/user/positions?address=0x...`
- `/api/user/orders?address=0x...`
- `/api/user/history?address=0x...&limit=100&offset=0`

## Troubleshooting

### WebSocket Server Won't Start
- Check if port 8080 or 8081 is already in use: `lsof -ti:8080,8081`
- Make sure `ws` package is installed: `npm list ws`

### Next.js Routes Not Working
- Make sure Next.js dev server is running: `lsof -ti:3000`
- Check browser console for errors
- Verify environment variables are set

### WebSocket Connection Issues
- Check browser console for WebSocket connection status
- Verify `NEXT_PUBLIC_WEBSOCKET_SERVER_URL` is set correctly
- Make sure WebSocket server is running before loading the app

## Production

Replace `server/test-websocket-server.js` with your production WebSocket server that:
1. Connects to Polymarket WebSocket
2. Stores trades in a database
3. Exposes HTTP REST endpoints
4. Handles authentication and authorization

