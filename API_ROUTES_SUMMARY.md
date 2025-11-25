# PolyTrade API Routes Summary

## ✅ Created API Routes

### Market Data Routes (Polymarket API)

1. **`/api/polymarket/market-search`** ✅ (Already existed)
   - GET: Find markets by pair/timeframe
   - Uses: `https://gamma-api.polymarket.com/markets`

2. **`/api/polymarket/prices`** ✅ NEW
   - GET: Get real-time prices for token(s)
   - Query params: `tokenId` (single) or `tokenIds` (comma-separated)
   - Uses: `https://api.polymarket.com/pricing/market-price` or `/multiple-market-prices`

3. **`/api/polymarket/orderbook`** ✅ NEW
   - GET: Get orderbook data for token(s)
   - Query params: `tokenId` (single) or `tokenIds` (comma-separated)
   - Uses: `https://api.polymarket.com/orderbook/order-book-summary` or `/multiple-order-books-summaries`

4. **`/api/polymarket/market-details`** ✅ NEW
   - GET: Get full market information
   - Query params: `id` or `slug`
   - Uses: `https://gamma-api.polymarket.com/markets`

5. **`/api/polymarket/price-history`** ✅ NEW
   - GET: Get price history for a token
   - Query params: `tokenId`, `startDate` (optional), `endDate` (optional)
   - Uses: `https://api.polymarket.com/pricing/price-history`

6. **`/api/polymarket/spreads`** ✅ NEW
   - GET: Get bid-ask spreads
   - Query params: `tokenId` (single) or `tokenIds` (comma-separated)
   - Uses: `https://api.polymarket.com/spreads/bid-ask-spreads`

### User Account Routes (WebSocket Server Integration Needed)

7. **`/api/user/balance`** ✅ NEW
   - GET: Get user's portfolio balance and cash
   - Query params: `address` (wallet address)
   - **TODO**: Connect to WebSocket server for real-time data

8. **`/api/user/positions`** ✅ NEW
   - GET: Get user's open positions
   - Query params: `address` (wallet address)
   - **TODO**: Connect to WebSocket server or query blockchain/database

9. **`/api/user/orders`** ✅ NEW
   - GET: Get user's open orders
   - Query params: `address` (wallet address)
   - **TODO**: Connect to WebSocket server or query CLOB API

10. **`/api/user/history`** ✅ NEW
    - GET: Get user's trade history
    - Query params: `address`, `limit` (optional), `offset` (optional)
    - **TODO**: Query database where WebSocket server stores trades

## 🔨 Still Need to Build

### Trading Routes
- `/api/trade/place-order` - Place buy/sell orders (needs CLOB API integration)
- `/api/trade/cancel-order` - Cancel open orders
- `/api/trade/close-position` - Close positions

### Analytics Routes
- `/api/analytics/price-point-stats` - Win rate by price point (1¢-99¢)
- `/api/analytics/strategy-performance` - Strategy metrics
- `/api/analytics/trade-details` - Detailed trade info

### Strategy Routes
- `/api/strategies/list` - Get all strategies for a user
- `/api/strategies/create` - Create new strategy
- `/api/strategies/update` - Update strategy
- `/api/strategies/toggle` - Enable/disable strategy

## 📝 Notes

1. **WebSocket Server Integration**: User account routes need to connect to your WebSocket server for real-time data. The routes are set up with placeholder TODOs.

2. **API Credentials**: Found in `API_ROUTES_PLAN.md`:
   - apiKey: `019ab8c6-a85a-76cc-b9b9-b339dfc9f0a8`
   - secret: `t7rnnkUvrkHRJ33IAOtf5X0LdmKaa7Ua5ZMyY6ZCRvM=`
   - passphrase: `50d92c939e5f5e421a44d586a2e7d4cce3f875933e03916bae5f045785989398`
   - **These should be moved to environment variables!**

3. **Environment Variables Needed**:
   - `WEBSOCKET_SERVER_URL` - URL of your WebSocket server
   - `POLYMARKET_API_KEY` - API key for authenticated endpoints
   - `POLYMARKET_SECRET` - Secret for authenticated endpoints
   - `POLYMARKET_PASSPHRASE` - Passphrase for authenticated endpoints

4. **Database**: Trade history and strategies will need database storage. The WebSocket server should be storing trades as they happen.

## 🔗 Polymarket API Documentation References

- Markets: https://docs.polymarket.com/developers/gamma-markets-api/get-markets
- Orderbook: https://docs.polymarket.com/api-reference/orderbook/get-order-book-summary
- Pricing: https://docs.polymarket.com/api-reference/pricing/get-market-price
- Spreads: https://docs.polymarket.com/api-reference/spreads/get-bid-ask-spreads

