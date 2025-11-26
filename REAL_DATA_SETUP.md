# Real Data Setup - Status

## ✅ What's Working

1. **WebSocket Server** - Running on `ws://localhost:8080` and `http://localhost:8081`
   - Returns real data for address: `0x2b288f1988b37ba6b5beec8fc779372b816a0f92`
   - Balance: $12,500.75 portfolio, $3,456.25 cash
   - Positions: 2 active positions
   - History: 2 trades

2. **API Routes** - All routes are responding
   - `/api/user/balance` - ✅ Working
   - `/api/user/positions` - ✅ Working  
   - `/api/user/orders` - ✅ Working
   - `/api/user/history` - ✅ Working

3. **Profile Page** - Updated to fetch real data from API

## 🔧 To See Real Data on Site

### Step 1: Make sure servers are running

**Terminal 1 - WebSocket Server:**
```bash
npm run test:server
```

**Terminal 2 - Next.js:**
```bash
npm run dev
```

### Step 2: Connect your wallet

1. Click the profile picture in the header
2. Connect with Phantom wallet
3. Your wallet address will be used to fetch data

### Step 3: View your profile

Navigate to: `http://localhost:3000/profile/0x2b288f1988b37ba6b5beec8fc779372b816a0f92`

The page will now show:
- **Real balance data** from WebSocket server
- **Real positions** (2 active positions)
- **Real trade history** (2 trades)
- **Calculated stats** (win rate, total PnL, etc.)

## 📊 Test Data Available

For address `0x2b288f1988b37ba6b5beec8fc779372b816a0f92`:

- **Balance**: $12,500.75 portfolio value, $3,456.25 cash
- **Positions**: 
  - BTC-15m YES: 150 shares @ $0.45, current $0.52 (+$10.50 PnL)
  - ETH-1h NO: 200 shares @ $0.38, current $0.35 (-$6.00 PnL)
- **History**: 2 trades (1 WIN, 1 LOSS)

## 🐛 Troubleshooting

If you see fallback data instead of real data:

1. Check WebSocket server is running: `curl http://localhost:8081/api/balance?address=0x2b288f1988b37ba6b5beec8fc779372b816a0f92`
2. Check Next.js server logs for errors
3. Verify environment variables (should default to localhost:8081)
4. Check browser console for API errors

## 🎯 Next Steps

- Update Header component to show real balance
- Add real-time updates via WebSocket connection
- Connect to production WebSocket server when ready

