'use server'

import { NextResponse } from 'next/server'

type TokenPair = { yes: string; no: string }
type CacheEntry = { data: TokenPair | null; expires: number }

const cache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 1000 * 60 // 1 minute

const normalizeText = (value?: string) => (value || '').toLowerCase()

const matchMarket = (market: any, pair: string, timeframe: string) => {
  const text =
    normalizeText(market?.question) ||
    normalizeText(market?.title) ||
    normalizeText(market?.slug)

  if (!text) return false

  const pairLower = pair.toLowerCase()
  const frameLower = timeframe.toLowerCase()

  const frameSynonyms = [frameLower, frameLower.replace('m', ' minute'), frameLower.replace('h', ' hour')]

  return (
    text.includes(pairLower) &&
    frameSynonyms.some((syn) => text.includes(syn)) &&
    (text.includes('next') || text.includes('candle') || text.includes('close'))
  )
}

const extractTokens = (market: any): TokenPair | null => {
  if (!market?.outcomes || !Array.isArray(market.outcomes)) return null

  const findToken = (predicate: (o: any) => boolean) => {
    const outcome = market.outcomes.find(predicate)
    if (!outcome) return null
    return (
      outcome.tokenId ||
      outcome.clobTokenId ||
      outcome.tokenAddress ||
      (Array.isArray(market.clobTokenIds) ? market.clobTokenIds[outcome.index ?? 0] : null)
    )
  }

  let yesToken =
    findToken((o) => normalizeText(o.title).includes('yes') || o.outcome === 'YES' || o.index === 0) ||
    findToken((o) => normalizeText(o.title).includes('up'))

  let noToken =
    findToken((o) => normalizeText(o.title).includes('no') || o.outcome === 'NO' || o.index === 1) ||
    findToken((o) => normalizeText(o.title).includes('down'))

  if (!yesToken && !noToken && market.outcomes.length >= 2) {
    // Fallback to index-based lookup
    const outcome0 = market.outcomes[0]
    const outcome1 = market.outcomes[1]
    if (outcome0) {
      yesToken =
        outcome0.tokenId ||
        outcome0.clobTokenId ||
        outcome0.tokenAddress ||
        (Array.isArray(market.clobTokenIds) ? market.clobTokenIds[0] : null)
    }
    if (outcome1) {
      noToken =
        outcome1.tokenId ||
        outcome1.clobTokenId ||
        outcome1.tokenAddress ||
        (Array.isArray(market.clobTokenIds) ? market.clobTokenIds[1] : null)
    }
  }

  if (yesToken && noToken) {
    return { yes: yesToken, no: noToken }
  }

  return null
}

const fetchMarkets = async () => {
  const url = 'https://gamma-api.polymarket.com/markets?closed=false&limit=500'
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
    const markets = await fetchMarkets()
    const match = markets.find((market: any) => matchMarket(market, pair, timeframe))
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

