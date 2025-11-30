// Test script for price-history API endpoint
const testPriceHistory = async () => {
  const marketId = '763549'
  const yesTokenId = '50198661135625965425699461127868116640732764881334063067176836012380238468338'
  const noTokenId = '85301660890742424306442634816019000539788248669983621033997700019628298618682'
  
  // Test 1: Query by marketId only
  console.log('Test 1: Query by marketId...')
  try {
    const response1 = await fetch(`http://localhost:3000/api/polymarket/price-history?marketId=${marketId}`)
    const data1 = await response1.json()
    console.log(`Status: ${response1.status}`)
    console.log(`Records: ${data1.count || data1.data?.length || 0}`)
    if (data1.data && data1.data.length > 0) {
      console.log('Sample data point:', data1.data[0])
      console.log('Last data point:', data1.data[data1.data.length - 1])
    }
    console.log('')
  } catch (error) {
    console.error('Error:', error.message)
  }

  // Test 2: Query by tokenIds
  console.log('Test 2: Query by tokenIds...')
  try {
    const response2 = await fetch(`http://localhost:3000/api/polymarket/price-history?yesTokenId=${yesTokenId}&noTokenId=${noTokenId}`)
    const data2 = await response2.json()
    console.log(`Status: ${response2.status}`)
    console.log(`Records: ${data2.count || data2.data?.length || 0}`)
    if (data2.data && data2.data.length > 0) {
      console.log('Sample data point:', data2.data[0])
    }
    console.log('')
  } catch (error) {
    console.error('Error:', error.message)
  }

  // Test 3: Query with time range (last 5 minutes)
  console.log('Test 3: Query with time range (last 5 minutes)...')
  try {
    const now = Date.now()
    const fiveMinutesAgo = now - (5 * 60 * 1000)
    const response3 = await fetch(`http://localhost:3000/api/polymarket/price-history?marketId=${marketId}&startTime=${fiveMinutesAgo}&endTime=${now}`)
    const data3 = await response3.json()
    console.log(`Status: ${response3.status}`)
    console.log(`Records: ${data3.count || data3.data?.length || 0}`)
    if (data3.data && data3.data.length > 0) {
      console.log('First point:', new Date(data3.data[0].time).toISOString())
      console.log('Last point:', new Date(data3.data[data3.data.length - 1].time).toISOString())
    }
  } catch (error) {
    console.error('Error:', error.message)
  }
}

testPriceHistory().catch(console.error)

