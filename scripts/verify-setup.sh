#!/bin/bash

echo "🔍 Verifying PolyTrade Setup"
echo "=============================="
echo ""

# Check if Next.js is running
echo "1. Checking Next.js server (port 3000)..."
if lsof -ti:3000 > /dev/null 2>&1; then
    echo "   ✅ Next.js server is running"
    NEXTJS_RUNNING=true
else
    echo "   ❌ Next.js server is NOT running"
    echo "      Run: npm run dev"
    NEXTJS_RUNNING=false
fi
echo ""

# Check if WebSocket server is running
echo "2. Checking WebSocket server (port 8080)..."
if lsof -ti:8080 > /dev/null 2>&1; then
    echo "   ✅ WebSocket server is running"
    WS_RUNNING=true
else
    echo "   ❌ WebSocket server is NOT running"
    echo "      Run: npm run test:server"
    WS_RUNNING=false
fi
echo ""

# Check if HTTP server is running
echo "3. Checking HTTP server (port 8081)..."
if lsof -ti:8081 > /dev/null 2>&1; then
    echo "   ✅ HTTP server is running"
    HTTP_RUNNING=true
else
    echo "   ❌ HTTP server is NOT running"
    echo "      (Should start with WebSocket server)"
    HTTP_RUNNING=false
fi
echo ""

# Test WebSocket server HTTP endpoint
if [ "$HTTP_RUNNING" = true ]; then
    echo "4. Testing WebSocket server HTTP endpoint..."
    RESPONSE=$(curl -s http://localhost:8081/api/balance?address=0x1234567890123456789012345678901234567890)
    if echo "$RESPONSE" | grep -q "success"; then
        echo "   ✅ HTTP endpoint is responding"
        echo "   Response: $(echo $RESPONSE | head -c 100)..."
    else
        echo "   ❌ HTTP endpoint is not responding correctly"
    fi
    echo ""
fi

# Test Next.js API routes
if [ "$NEXTJS_RUNNING" = true ]; then
    echo "5. Testing Next.js API routes..."
    
    # Test user balance route
    BALANCE_RESPONSE=$(curl -s http://localhost:3000/api/user/balance?address=0x1234567890123456789012345678901234567890)
    if echo "$BALANCE_RESPONSE" | grep -q "totalValue\|portfolioValue"; then
        echo "   ✅ /api/user/balance is working"
    else
        echo "   ❌ /api/user/balance is not working"
    fi
    
    # Test market search route
    MARKET_RESPONSE=$(curl -s "http://localhost:3000/api/polymarket/market-search?pair=BTC&timeframe=15m")
    if echo "$MARKET_RESPONSE" | grep -q "yes\|no\|error"; then
        echo "   ✅ /api/polymarket/market-search is working"
    else
        echo "   ❌ /api/polymarket/market-search is not working"
    fi
    echo ""
fi

# Summary
echo "=============================="
echo "Summary:"
if [ "$NEXTJS_RUNNING" = true ] && [ "$WS_RUNNING" = true ] && [ "$HTTP_RUNNING" = true ]; then
    echo "✅ All servers are running!"
    echo ""
    echo "Next steps:"
    echo "  - Run: npm run test:routes"
    echo "  - Check browser console for WebSocket connection"
else
    echo "⚠️  Some servers are not running"
    echo ""
    echo "To start everything:"
    echo "  1. Terminal 1: npm run dev"
    echo "  2. Terminal 2: npm run test:server"
fi
echo ""

