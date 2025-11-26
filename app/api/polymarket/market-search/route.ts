'use server'

import { NextResponse } from 'next/server'

type TokenPair = { yes: string; no: string }
type CacheEntry = { data: TokenPair | null; expires: number }

const cache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 1000 * 60 // 1 minute

const normalizeText = (value?: string) => (value || '').toLowerCase()

const matchMarket = (market: any, pair: string, timeframe: string) => {
  // Must be active and accepting orders
  if (!market?.active || market?.closed || !market?.acceptingOrders) {
    return false
  }

  const pairLower = pair.toLowerCase()
  const frameLower = timeframe.toLowerCase()
  const slug = normalizeText(market?.slug || '')
  const question = normalizeText(market?.question || '')
  const title = normalizeText(market?.title || '')
  const text = slug || question || title

  if (!text) return false

  // Pattern 1: Slug pattern (most reliable) - e.g., "btc-updown-15m-1764211500" or "btc-updown-1h-1764211500"
  // Format: {crypto}-updown-{timeframe}-{timestamp}
  // Escape special regex chars in timeframe (though 15m/1h don't need escaping)
  const escapedFrame = frameLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const slugPattern = new RegExp(`^${pairLower}-updown-${escapedFrame}-\\d+$`)
  if (slug && slugPattern.test(slug)) {
    return true
  }

  // Pattern 2: Question/title pattern - e.g., "Bitcoin Up or Down - November 26, 9:45PM-10:00PM ET"
  // Format: "{Crypto} Up or Down - {Date}, {Time}-{Time} ET"
  const hasPair = 
    text.includes(pairLower) || 
    (pairLower === 'btc' && text.includes('bitcoin')) ||
    (pairLower === 'eth' && text.includes('ethereum')) ||
    (pairLower === 'sol' && text.includes('solana')) ||
    (pairLower === 'xrp' && text.includes('xrp'))

  const hasUpDown = text.includes('up or down') || text.includes('up/down') || (text.includes('up') && text.includes('down'))
  
  // Timeframe matching - handle 15m, 1h, etc.
  const frameSynonyms = [
    frameLower,
    frameLower.replace('m', 'm'),
    frameLower.replace('h', 'h'),
    frameLower.replace('m', ' minute'),
    frameLower.replace('h', ' hour'),
  ]
  const hasTimeframe = frameSynonyms.some((syn) => text.includes(syn))

  return hasPair && hasUpDown && hasTimeframe
}

const extractTokens = (market: any): TokenPair | null => {
  // Handle clobTokenIds as JSON string array (e.g., "[\"token1\", \"token2\"]")
  let tokenIds: string[] = []
  
  if (market?.clobTokenIds) {
    if (Array.isArray(market.clobTokenIds)) {
      tokenIds = market.clobTokenIds
    } else if (typeof market.clobTokenIds === 'string') {
      try {
        tokenIds = JSON.parse(market.clobTokenIds)
      } catch {
        // If parsing fails, try to extract from string
        tokenIds = []
      }
    }
  }

  // Parse outcomes to determine which token is Up/Down
  let outcomes: string[] = []
  if (market?.outcomes) {
    if (Array.isArray(market.outcomes)) {
      outcomes = market.outcomes
    } else if (typeof market.outcomes === 'string') {
      try {
        outcomes = JSON.parse(market.outcomes)
      } catch {
        outcomes = []
      }
    }
  }

  // For crypto UP/DOWN markets: outcomes are ["Up", "Down"]
  // First token = "Up" (yes), Second token = "Down" (no)
  if (outcomes.length >= 2 && tokenIds.length >= 2) {
    const upIndex = outcomes.findIndex((o: string) => normalizeText(o) === 'up')
    const downIndex = outcomes.findIndex((o: string) => normalizeText(o) === 'down')
    
    if (upIndex >= 0 && downIndex >= 0) {
      return {
        yes: tokenIds[upIndex], // "Up" token
        no: tokenIds[downIndex] // "Down" token
      }
    }
    
    // Fallback: assume first = Up, second = Down (standard pattern)
    if (tokenIds.length >= 2) {
      return {
        yes: tokenIds[0], // First token = Up
        no: tokenIds[1]   // Second token = Down
      }
    }
  }

  // Legacy fallback: try to extract from outcomes array structure
  if (Array.isArray(market?.outcomes) && market.outcomes.length >= 2) {
    const outcome0 = market.outcomes[0]
    const outcome1 = market.outcomes[1]
    
    const yesToken = 
      outcome0?.tokenId || 
      outcome0?.clobTokenId || 
      outcome0?.tokenAddress ||
      (tokenIds.length > 0 ? tokenIds[0] : null)
    
    const noToken = 
      outcome1?.tokenId || 
      outcome1?.clobTokenId || 
      outcome1?.tokenAddress ||
      (tokenIds.length > 1 ? tokenIds[1] : null)

    if (yesToken && noToken) {
      return { yes: yesToken, no: noToken }
    }
  }

  return null
}

// Search markets using Gamma search endpoint (`/search`), as recommended:
// - https://gamma-api.polymarket.com/search?query=BTC%2015m%20UP&type=market&closed=false&limit=50
// This is best for short‑lived crypto UP/DOWN 15m/1h markets whose slugs rotate.
const searchMarkets = async (pair: string, timeframe: string) => {
  const queries = [
    `${pair} ${timeframe} up`,
    `${pair} ${timeframe} down`,
    `${pair} ${timeframe} next candle`,
    `${pair} ${timeframe} candle`,
    `${pair} ${timeframe}`,
  ]

  const allMarkets: any[] = []

  for (const query of queries) {
    try {
      const url = `https://gamma-api.polymarket.com/search?type=market&closed=false&limit=50&query=${encodeURIComponent(
        query
      )}`
      const response = await fetch(url, { cache: 'no-store' })

      if (!response.ok) {
        // Ignore 4xx/5xx here; we'll fall back to /markets
        continue
      }

      const data = await response.json()

      if (Array.isArray(data)) {
        allMarkets.push(...data)
      } else if (Array.isArray(data?.markets)) {
        allMarkets.push(...data.markets)
      } else if (Array.isArray(data?.results)) {
        allMarkets.push(...data.results)
      } else if (Array.isArray(data?.data)) {
        allMarkets.push(...data.data)
      }
    } catch (error) {
      console.error('Search API error:', error)
    }
  }

  return allMarkets
}

// Fallback: fetch active markets directly from Gamma `/markets` endpoint
// https://gamma-api.polymarket.com/markets?closed=false&limit=100
const fetchMarkets = async () => {
  const url = 'https://gamma-api.polymarket.com/markets?closed=false&limit=500&order=id&ascending=false'
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`Gamma markets request failed: ${response.status}`)
  }
  const data = await response.json()
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.data)) return data.data
  return []
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const pair = searchParams.get('pair')
  const timeframe = searchParams.get('timeframe')

  if (!pair || !timeframe) {
    return NextResponse.json({ error: 'Missing pair or timeframe' }, { status: 400 })
  }

  const cacheKey = `${pair}-${timeframe}`
  const cached = cache.get(cacheKey)
  const now = Date.now()
  if (cached && cached.expires > now) {
    if (cached.data) {
      return NextResponse.json(cached.data)
    }
    return NextResponse.json({ error: 'Token IDs not found' }, { status: 404 })
  }

  try {
    // Strategy 1: fetch active markets from /markets endpoint (most reliable for crypto UP/DOWN markets)
    // This endpoint returns markets with slug pattern: {crypto}-updown-{timeframe}-{timestamp}
    let markets = await fetchMarkets()
    let match = markets.find((market: any) => matchMarket(market, pair, timeframe))

    // Strategy 2: fall back to search endpoint if /markets didn't find a match
    if (!match) {
      markets = await searchMarkets(pair, timeframe)
      match = markets.find((market: any) => matchMarket(market, pair, timeframe)) || markets[0]
    }

    const tokens = extractTokens(match)

    cache.set(cacheKey, { data: tokens ?? null, expires: now + CACHE_TTL_MS })

    if (tokens) {
      return NextResponse.json(tokens)
    }

    return NextResponse.json({ error: 'Token IDs not found' }, { status: 404 })
  } catch (error) {
    console.error('Market search error:', error)
    return NextResponse.json({ error: 'Failed to fetch markets' }, { status: 500 })
  }
}

