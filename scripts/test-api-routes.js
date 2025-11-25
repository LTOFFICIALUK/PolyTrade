/**
 * Test script to verify all API routes are working
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
const TEST_ADDRESS = '0x1234567890123456789012345678901234567890'

const routes = [
  // Polymarket routes
  {
    name: 'Market Search',
    url: `${BASE_URL}/api/polymarket/market-search?pair=BTC&timeframe=15m`,
    method: 'GET',
  },
  {
    name: 'Market Details',
    url: `${BASE_URL}/api/polymarket/market-details?id=test-market-id`,
    method: 'GET',
  },
  {
    name: 'Prices (single)',
    url: `${BASE_URL}/api/polymarket/prices?tokenId=test-token-id`,
    method: 'GET',
  },
  {
    name: 'Prices (multiple)',
    url: `${BASE_URL}/api/polymarket/prices?tokenIds=token1,token2`,
    method: 'GET',
  },
  {
    name: 'Orderbook (single)',
    url: `${BASE_URL}/api/polymarket/orderbook?tokenId=test-token-id`,
    method: 'GET',
  },
  {
    name: 'Orderbook (multiple)',
    url: `${BASE_URL}/api/polymarket/orderbook?tokenIds=token1,token2`,
    method: 'GET',
  },
  {
    name: 'Price History',
    url: `${BASE_URL}/api/polymarket/price-history?tokenId=test-token-id`,
    method: 'GET',
  },
  {
    name: 'Spreads',
    url: `${BASE_URL}/api/polymarket/spreads?tokenId=test-token-id`,
    method: 'GET',
  },
  // User routes
  {
    name: 'User Balance',
    url: `${BASE_URL}/api/user/balance?address=${TEST_ADDRESS}`,
    method: 'GET',
  },
  {
    name: 'User Positions',
    url: `${BASE_URL}/api/user/positions?address=${TEST_ADDRESS}`,
    method: 'GET',
  },
  {
    name: 'User Orders',
    url: `${BASE_URL}/api/user/orders?address=${TEST_ADDRESS}`,
    method: 'GET',
  },
  {
    name: 'User History',
    url: `${BASE_URL}/api/user/history?address=${TEST_ADDRESS}&limit=10&offset=0`,
    method: 'GET',
  },
]

async function testRoute(route) {
  try {
    const startTime = Date.now()
    const response = await fetch(route.url, {
      method: route.method,
      headers: {
        'Content-Type': 'application/json',
      },
    })
    const duration = Date.now() - startTime
    const data = await response.json()

    return {
      name: route.name,
      status: response.status,
      ok: response.ok,
      duration,
      data: data,
      error: response.ok ? null : data.error || 'Unknown error',
    }
  } catch (error) {
    return {
      name: route.name,
      status: 0,
      ok: false,
      duration: 0,
      error: error.message,
    }
  }
}

async function runTests() {
  console.log('🧪 Testing API Routes\n')
  console.log(`Base URL: ${BASE_URL}\n`)
  console.log('─'.repeat(80))

  const results = []
  for (const route of routes) {
    const result = await testRoute(route)
    results.push(result)

    const statusIcon = result.ok ? '✅' : '❌'
    const statusColor = result.ok ? '\x1b[32m' : '\x1b[31m'
    const resetColor = '\x1b[0m'

    console.log(
      `${statusIcon} ${result.name.padEnd(30)} ${statusColor}${result.status}${resetColor} ${result.duration}ms`
    )
    if (result.error) {
      console.log(`   Error: ${result.error}`)
    }
  }

  console.log('─'.repeat(80))
  const passed = results.filter((r) => r.ok).length
  const failed = results.filter((r) => !r.ok).length
  console.log(`\n✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`📊 Total: ${results.length}\n`)

  if (failed > 0) {
    console.log('Failed routes:')
    results
      .filter((r) => !r.ok)
      .forEach((r) => {
        console.log(`  - ${r.name}: ${r.error}`)
      })
    process.exit(1)
  } else {
    console.log('🎉 All routes are working!')
    process.exit(0)
  }
}

// Check if Next.js server is running
async function checkServer() {
  try {
    const response = await fetch(`${BASE_URL}/api/polymarket/market-search?pair=BTC&timeframe=15m`)
    return response.status !== 0
  } catch (error) {
    return false
  }
}

async function main() {
  console.log('Checking if Next.js server is running...\n')
  const serverRunning = await checkServer()

  if (!serverRunning) {
    console.error('❌ Next.js server is not running!')
    console.error(`   Please start it with: npm run dev`)
    console.error(`   Then run this script again.`)
    process.exit(1)
  }

  await runTests()
}

main()

