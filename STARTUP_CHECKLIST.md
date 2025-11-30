# 🚀 PolyTrade Startup Checklist

**Purpose**: Complete step-by-step guide to start all services from a fresh computer boot. Use this when localhost:3000 isn't running, ws-service isn't running, and Docker might not be running.

---

## Prerequisites Check

Before starting, verify you have:
- ✅ Node.js installed (`node --version`)
- ✅ npm installed (`npm --version`)
- ✅ Docker Desktop installed and running (`docker ps`)

---

## Step 1: Start Database (Docker/TimescaleDB)

**Why**: Stores historical price data. Must be running before ws-service starts collecting data.

### 1.1 Check if Docker is running
```bash
docker ps
```
**Expected**: Should show running containers (or empty list if nothing is running)

**If error**: 
- **Using automated script**: The `startup.sh` script will automatically start Docker Desktop if it's installed
- **Manual**: Start Docker Desktop from Applications or Spotlight search
- **Not installed**: Install from https://www.docker.com/products/docker-desktop

### 1.2 Check if TimescaleDB container exists
```bash
docker ps -a | grep polytrade-timescaledb
```
**Expected**: Container exists (may be stopped)

### 1.3 Start TimescaleDB
```bash
cd /Users/lukecarter/Downloads/PolyTrade-main
docker-compose up -d timescaledb
```

**Wait for**: Container to be healthy (about 10-15 seconds)

### 1.4 Verify database is ready
```bash
docker-compose exec timescaledb pg_isready -U polytrade
```
**Expected**: `timescaledb:5432 - accepting connections`

### 1.5 Verify database tables exist
```bash
docker-compose exec timescaledb psql -U polytrade -d polytrade -c "\dt"
```
**Expected**: Should show `price_history` table

**If table missing**: Run migrations
```bash
docker-compose exec -T timescaledb psql -U polytrade -d polytrade < database/migrations/001_create_price_history.sql
```

**✅ Database Status**: Running and ready

---

## Step 2: Verify Environment Configuration

**Why**: Ensures services connect to correct ports and database.

### 2.1 Check `.env.local` exists
```bash
cd /Users/lukecarter/Downloads/PolyTrade-main
ls -la .env.local
```

### 2.2 Verify required environment variables
```bash
cat .env.local | grep -E "DATABASE_URL|WEBSOCKET|HTTP"
```

**Required variables**:
- `DATABASE_URL=postgresql://polytrade:polytrade_dev_password@localhost:5432/polytrade`
- `NEXT_PUBLIC_WEBSOCKET_SERVER_URL=ws://localhost:8081`
- `WEBSOCKET_SERVER_HTTP_URL=http://localhost:8081`

**If missing**: Create/update `.env.local`:
```bash
cat > .env.local << 'EOF'
DATABASE_URL=postgresql://polytrade:polytrade_dev_password@localhost:5432/polytrade
NEXT_PUBLIC_WEBSOCKET_SERVER_URL=ws://localhost:8081
WEBSOCKET_SERVER_HTTP_URL=http://localhost:8081
EOF
```

**✅ Environment Status**: Configured correctly

---

## Step 3: Kill Any Existing Servers

**Why**: Prevents port conflicts and ensures clean startup.

### 3.1 Kill processes on port 8081 (ws-service HTTP/WebSocket)
```bash
lsof -ti :8081 | xargs kill -9 2>/dev/null || true
```

### 3.2 Kill processes on port 3000 (Next.js)
```bash
lsof -ti :3000 | xargs kill -9 2>/dev/null || true
```

### 3.3 Verify ports are free
```bash
lsof -i :8081 && echo "⚠️  Port 8081 still in use" || echo "✅ Port 8081 is free"
lsof -i :3000 && echo "⚠️  Port 3000 still in use" || echo "✅ Port 3000 is free"
```

**✅ Ports Status**: Free and ready

---

## Step 4: Build WebSocket Service

**Why**: TypeScript needs to be compiled before running.

### 4.1 Navigate to ws-service directory
```bash
cd /Users/lukecarter/Downloads/PolyTrade-main/ws-service
```

### 4.2 Install dependencies (if needed)
```bash
npm install
```

### 4.3 Build TypeScript
```bash
npm run build
```

**Expected**: Should complete without errors, creating `dist/` folder

**✅ Build Status**: Compiled successfully

---

## Step 5: Start WebSocket Service (Data Collection)

**Why**: This service:
- Fetches market data from Polymarket
- Records price history to database
- Provides WebSocket/HTTP API for frontend
- Must be running before frontend starts

### 5.1 Start ws-service
```bash
cd /Users/lukecarter/Downloads/PolyTrade-main/ws-service
HTTP_PORT=8081 npm run start
```

**Keep this terminal window open!**

**Expected output**:
```
[Server] HTTP server listening on http://localhost:8081
[Server] WebSocket server listening on ws://localhost:8081/ws
[Server] Health endpoint: http://localhost:8081/health
```

### 5.2 Verify ws-service is running (in a new terminal)
```bash
curl -s http://localhost:8081/health
```
**Expected**: `{"status":"ok"}`

### 5.3 Verify data collection started
```bash
curl -s -X POST http://localhost:8081/markets/current \
  -H "Content-Type: application/json" \
  -d '{"pair":"BTC","timeframe":"1h"}' | jq '{marketId, question}'
```
**Expected**: Returns market data with `marketId` and `question`

**✅ WebSocket Service Status**: Running and collecting data

---

## Step 6: Start Next.js Frontend

**Why**: Provides the UI at localhost:3000

### 6.1 Navigate to project root
```bash
cd /Users/lukecarter/Downloads/PolyTrade-main
```

### 6.2 Install dependencies (if needed)
```bash
npm install
```

### 6.3 Start Next.js dev server
```bash
npm run dev
```

**Keep this terminal window open!**

**Expected output**:
```
✓ Ready in X seconds
○ Local: http://localhost:3000
```

### 6.4 Verify Next.js is running (in a new terminal)
```bash
curl -s http://localhost:3000 | head -20
```
**Expected**: HTML content (Next.js page)

**✅ Frontend Status**: Running

---

## Step 7: Verify Data Collection is Working

**Why**: Ensures price history is being recorded to database.

### 7.1 Check if price data is being recorded
```bash
docker-compose exec timescaledb psql -U polytrade -d polytrade -c \
  "SELECT COUNT(*) as total_records, MAX(timestamp) as latest_record FROM price_history;"
```

**Expected**: Should show record count > 0 and recent timestamp

### 7.2 Check recent market data
```bash
docker-compose exec timescaledb psql -U polytrade -d polytrade -c \
  "SELECT market_id, COUNT(*) as records, MIN(timestamp) as first, MAX(timestamp) as last FROM price_history GROUP BY market_id ORDER BY last DESC LIMIT 5;"
```

**Expected**: Should show recent markets with data

**✅ Data Collection Status**: Recording price history

---

## Step 8: Open Browser and Test

### 8.1 Open browser
Navigate to: `http://localhost:3000`

### 8.2 Expected behavior:
- ✅ Page loads without errors
- ✅ No WebSocket connection errors in browser console
- ✅ Chart displays (may show historical data)
- ✅ Orderbook displays current prices
- ✅ Trading panel shows buy/sell buttons

### 8.3 Check browser console
Open DevTools (F12) → Console tab

**Should NOT see**:
- ❌ `WebSocket connection to 'ws://localhost:8080/ws' failed`
- ❌ `Connection refused` errors

**Should see**:
- ✅ `[useCurrentMarket] Starting auto-refresh`
- ✅ `[PolyLineChart] Fetched X historical data points`

**✅ Browser Status**: Application working correctly

---

## Quick Verification Commands

Run these to verify everything is running:

```bash
# Check all services at once
echo "=== Database ===" && \
docker-compose ps timescaledb && \
echo "" && \
echo "=== WebSocket Service ===" && \
curl -s http://localhost:8081/health && \
echo "" && \
echo "=== Next.js ===" && \
curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:3000
```

**Expected output**:
```
=== Database ===
NAME                  STATUS
polytrade-timescaledb Up (healthy)

=== WebSocket Service ===
{"status":"ok"}

=== Next.js ===
Status: 200
```

---

## Troubleshooting

### Database won't start
```bash
# Check Docker is running
docker ps

# Check container logs
docker-compose logs timescaledb

# Restart container
docker-compose restart timescaledb
```

### WebSocket service won't start
```bash
# Check if port is in use
lsof -i :8081

# Check ws-service logs
cd /Users/lukecarter/Downloads/PolyTrade-main/ws-service
npm run build  # Rebuild if needed
HTTP_PORT=8081 npm run start
```

### Next.js won't start
```bash
# Check if port is in use
lsof -i :3000

# Reinstall dependencies
cd /Users/lukecarter/Downloads/PolyTrade-main
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### No data in database
```bash
# Check if ws-service is recording
curl -s -X POST http://localhost:8081/markets/current \
  -H "Content-Type: application/json" \
  -d '{"pair":"BTC","timeframe":"1h"}' | jq

# Check database directly
docker-compose exec timescaledb psql -U polytrade -d polytrade -c \
  "SELECT * FROM price_history ORDER BY timestamp DESC LIMIT 5;"
```

### WebSocket connection errors in browser
- Verify `.env.local` has: `NEXT_PUBLIC_WEBSOCKET_SERVER_URL=ws://localhost:8081`
- Restart Next.js server after changing `.env.local`
- Verify ws-service is running: `curl http://localhost:8081/health`

---

## Summary: What Should Be Running

After completing all steps, you should have:

1. ✅ **Docker/TimescaleDB**: Running on port 5432 (database)
2. ✅ **ws-service**: Running on port 8081 (HTTP + WebSocket)
3. ✅ **Next.js**: Running on port 3000 (frontend)
4. ✅ **Data Collection**: Price history being recorded to database
5. ✅ **Browser**: http://localhost:3000 showing working application

---

## Quick Start Script (Future Enhancement)

For automation, you can create a script that runs all these steps:

```bash
#!/bin/bash
# scripts/startup.sh - Automated startup script

# Step 1: Database
docker-compose up -d timescaledb
sleep 5

# Step 2: Kill existing servers
lsof -ti :8081 | xargs kill -9 2>/dev/null || true
lsof -ti :3000 | xargs kill -9 2>/dev/null || true

# Step 3: Build ws-service
cd ws-service && npm run build && cd ..

# Step 4: Start ws-service (background)
cd ws-service && HTTP_PORT=8081 npm run start &

# Step 5: Start Next.js (background)
npm run dev &

echo "✅ All services starting..."
echo "Check: http://localhost:3000"
```

---

## Notes

- **Keep terminal windows open**: Both ws-service and Next.js must stay running
- **Database persists**: TimescaleDB data survives restarts (Docker volume)
- **Environment variables**: Changes to `.env.local` require Next.js restart
- **TypeScript changes**: Changes to `ws-service/src/` require `npm run build`
- **Port conflicts**: Always kill existing processes before starting

---

**Last Updated**: Based on current project structure
**For Cursor AI**: This checklist provides complete context for startup sequence

