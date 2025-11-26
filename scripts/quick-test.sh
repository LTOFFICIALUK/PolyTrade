#!/bin/bash

echo "Testing WebSocket Server..."
echo "=========================="

# Check if server is running
if ! lsof -ti:8081 > /dev/null 2>&1; then
    echo "❌ Server is not running on port 8081"
    echo ""
    echo "Start it with: npm run test:server"
    exit 1
fi

echo "✅ Server is running"
echo ""

# Test the endpoint
ADDRESS="0x2b288f1988b37ba6b5beec8fc779372b816a0f92"
echo "Testing: http://localhost:8081/api/balance?address=$ADDRESS"
echo ""

RESPONSE=$(curl -s "http://localhost:8081/api/balance?address=$ADDRESS")

if [ -z "$RESPONSE" ]; then
    echo "❌ No response from server"
    exit 1
fi

echo "Response:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""

# Check if it's valid JSON with success
if echo "$RESPONSE" | grep -q '"success"'; then
    echo "✅ Server is responding correctly!"
else
    echo "⚠️  Response received but format may be unexpected"
fi

