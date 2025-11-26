# PolyTrade API Routes Plan

## Required API Routes

Based on the application's features, here are the API routes we need to build:

### 1. **Market Data Routes**
- ✅ `/api/polymarket/market-search` - Find markets by pair/timeframe (already exists)
- `/api/polymarket/prices` - Get real-time prices for token pairs
- `/api/polymarket/orderbook` - Get orderbook data for a market
- `/api/polymarket/market-details` - Get full market information

### 2. **User Account Routes**
- `/api/user/balance` - Get user's portfolio balance and cash
- `/api/user/positions` - Get user's open positions
- `/api/user/orders` - Get user's open orders
- `/api/user/history` - Get user's trade history
- `/api/user/profile` - Get user profile stats (wallet address)

### 3. **Trading Routes**
- `/api/trade/place-order` - Place buy/sell orders
- `/api/trade/cancel-order` - Cancel an open order
- `/api/trade/close-position` - Close an open position

### 4. **Analytics Routes**
- `/api/analytics/price-point-stats` - Win rate by price point (1¢-99¢)
- `/api/analytics/strategy-performance` - Performance metrics for strategies
- `/api/analytics/trade-details` - Detailed trade information

### 5. **Strategy Routes**
- `/api/strategies/list` - Get all strategies for a user
- `/api/strategies/create` - Create a new strategy
- `/api/strategies/update` - Update strategy settings
- `/api/strategies/toggle` - Enable/disable a strategy

## Information Needed from You

To build these API routes, I need:

### 1. **Polymarket API Documentation**
- What are the official Polymarket API endpoints?
- Base URLs for:
  - Market data API
  - CLOB (Central Limit Order Book) API
  - User account API
  - Trading API
- Authentication requirements:
  - Do we need API keys?
  - Do we need to sign requests with wallet private keys?
  - Are there rate limits?

### 2. **Data Storage**
- Where should we store:
  - User trade history (database? blockchain?)
  - Strategy configurations
  - User preferences
  - Analytics data
- Do you have a database set up? (PostgreSQL, MongoDB, etc.)
- Should we use a service like Supabase, Firebase, or self-hosted?

### 3. **Wallet Integration**
- How do we authenticate user requests?
- Do we need to verify wallet signatures for API calls?
- Should we store wallet addresses in a database?

### 4. **Polymarket Specific APIs**
- What endpoints exist for:
  - Getting user positions from Polymarket?
  - Getting user order history?
  - Placing orders through Polymarket?
  - Getting account balances?
- Are these available through Polymarket's API or do we need to query the blockchain directly?

### 5. **Current API Usage**
- I see you're using:
  - `https://gamma-api.polymarket.com/markets` - for market search
  - `https://clob.polymarket.com/price` - for price data
- Are there other endpoints we should be using?
- What's the structure of responses from these APIs?

### 6. **Rate Limits & Caching**
- What are the rate limits for Polymarket APIs?
- How should we handle caching?
- Should we use WebSockets for real-time data?

## Next Steps

Once you provide:
1. Polymarket API documentation/endpoints
2. Database setup preferences
3. Authentication approach
4. Any API keys or credentials needed

I can start building all the API routes with proper error handling, caching, and authentication.




