#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Starting PolyTrade Servers and Testing Routes${NC}"
echo "=========================================="
echo ""

# Check if ws is installed
if ! npm list ws > /dev/null 2>&1; then
    echo -e "${YELLOW}Installing ws package...${NC}"
    npm install ws --save-dev
fi

# Kill any existing servers
echo "Cleaning up existing servers..."
lsof -ti:8080 | xargs kill -9 2>/dev/null || true
lsof -ti:8081 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
sleep 1

# Start WebSocket server
echo -e "${GREEN}Starting WebSocket server...${NC}"
node server/test-websocket-server.js > /tmp/websocket-server.log 2>&1 &
WS_PID=$!
sleep 2

# Check if WebSocket server started
if ! kill -0 $WS_PID 2>/dev/null; then
    echo -e "${RED}❌ Failed to start WebSocket server${NC}"
    cat /tmp/websocket-server.log
    exit 1
fi

# Test WebSocket server HTTP endpoint
echo "Testing WebSocket server HTTP endpoint..."
for i in {1..5}; do
    if curl -s http://localhost:8081/api/balance?address=0x1234567890123456789012345678901234567890 > /dev/null; then
        echo -e "${GREEN}✅ WebSocket server is responding${NC}"
        break
    fi
    if [ $i -eq 5 ]; then
        echo -e "${RED}❌ WebSocket server is not responding${NC}"
        kill $WS_PID 2>/dev/null
        exit 1
    fi
    sleep 1
done

# Start Next.js server
echo -e "${GREEN}Starting Next.js dev server...${NC}"
npm run dev > /tmp/nextjs-server.log 2>&1 &
NEXTJS_PID=$!
sleep 5

# Check if Next.js server started
if ! kill -0 $NEXTJS_PID 2>/dev/null; then
    echo -e "${RED}❌ Failed to start Next.js server${NC}"
    cat /tmp/nextjs-server.log
    kill $WS_PID 2>/dev/null
    exit 1
fi

# Test Next.js server
echo "Testing Next.js server..."
for i in {1..10}; do
    if curl -s http://localhost:3000 > /dev/null; then
        echo -e "${GREEN}✅ Next.js server is responding${NC}"
        break
    fi
    if [ $i -eq 10 ]; then
        echo -e "${RED}❌ Next.js server is not responding${NC}"
        kill $WS_PID $NEXTJS_PID 2>/dev/null
        exit 1
    fi
    sleep 1
done

echo ""
echo -e "${GREEN}✅ Both servers are running!${NC}"
echo ""
echo "Testing API routes..."
echo "===================="

# Test routes
TEST_ADDRESS="0x1234567890123456789012345678901234567890"
BASE_URL="http://localhost:3000"

test_route() {
    local name=$1
    local url=$2
    local response=$(curl -s -w "\n%{http_code}" "$url")
    local body=$(echo "$response" | head -n -1)
    local status=$(echo "$response" | tail -n 1)
    
    if [ "$status" = "200" ]; then
        echo -e "${GREEN}✅${NC} $name (200)"
        return 0
    else
        echo -e "${RED}❌${NC} $name ($status)"
        echo "   URL: $url"
        return 1
    fi
}

PASSED=0
FAILED=0

# Test user routes
test_route "User Balance" "$BASE_URL/api/user/balance?address=$TEST_ADDRESS" && ((PASSED++)) || ((FAILED++))
test_route "User Positions" "$BASE_URL/api/user/positions?address=$TEST_ADDRESS" && ((PASSED++)) || ((FAILED++))
test_route "User Orders" "$BASE_URL/api/user/orders?address=$TEST_ADDRESS" && ((PASSED++)) || ((FAILED++))
test_route "User History" "$BASE_URL/api/user/history?address=$TEST_ADDRESS&limit=10" && ((PASSED++)) || ((FAILED++))

# Test Polymarket routes (these may fail if Polymarket API is down, but should return 200 or 400/500)
test_route "Market Search" "$BASE_URL/api/polymarket/market-search?pair=BTC&timeframe=15m" && ((PASSED++)) || ((FAILED++))
test_route "Market Details" "$BASE_URL/api/polymarket/market-details?id=test" && ((PASSED++)) || ((FAILED++))
test_route "Prices" "$BASE_URL/api/polymarket/prices?tokenId=test" && ((PASSED++)) || ((FAILED++))
test_route "Orderbook" "$BASE_URL/api/polymarket/orderbook?tokenId=test" && ((PASSED++)) || ((FAILED++))

echo ""
echo "===================="
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All routes are working!${NC}"
    echo ""
    echo "Servers are running:"
    echo "  - WebSocket: ws://localhost:8080 (PID: $WS_PID)"
    echo "  - HTTP: http://localhost:8081 (PID: $WS_PID)"
    echo "  - Next.js: http://localhost:3000 (PID: $NEXTJS_PID)"
    echo ""
    echo "To stop servers, run:"
    echo "  kill $WS_PID $NEXTJS_PID"
else
    echo -e "${YELLOW}⚠️  Some routes failed. Check the errors above.${NC}"
fi

