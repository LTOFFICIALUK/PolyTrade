'use server'

import { NextResponse } from 'next/server'
import { OrderType as SDKOrderType, Side } from '@polymarket/clob-client'
import { makeAuthenticatedRequest } from '@/lib/polymarket-api-auth'
import { PolymarketApiCredentials } from '@/lib/polymarket-api-auth'
import { SignedOrder, OrderType } from '@/lib/polymarket-order-signing'

/**
 * POST /api/trade/place-order
 * Place a buy or sell order on Polymarket using L2 API credentials
 * 
 * Accepts a pre-signed order from the client and forwards it to Polymarket
 * 
 * Based on official Polymarket SDK:
 * - Python: https://github.com/Polymarket/py-clob-client
 * - TypeScript: https://github.com/Polymarket/clob-client
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      walletAddress,
      credentials,
      signedOrder, // Pre-signed order from client
      orderType = 'GTC', // 'GTC', 'GTD', 'FOK', or 'FAK'
    } = body

    // Validate required fields
    if (!walletAddress || !credentials || !signedOrder) {
      return NextResponse.json(
        { error: 'Missing required fields: walletAddress, credentials, signedOrder' },
        { status: 400 }
      )
    }

    // Validate signed order structure
    const requiredOrderFields = [
      'salt',
      'maker',
      'signer',
      'taker',
      'tokenId',
      'makerAmount',
      'takerAmount',
      'expiration',
      'nonce',
      'feeRateBps',
      'side',
      'signatureType',
      'signature',
    ]

    for (const field of requiredOrderFields) {
      if (!(field in signedOrder)) {
        return NextResponse.json(
          { error: `Missing required order field: ${field}` },
          { status: 400 }
        )
      }
    }

    // Validate order type
    const validOrderTypes: OrderType[] = [OrderType.GTC, OrderType.GTD, OrderType.FOK, OrderType.FAK]
    if (!validOrderTypes.includes(orderType as OrderType)) {
      return NextResponse.json(
        { error: `Invalid order type. Must be one of: ${validOrderTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate credentials structure
    if (!credentials.apiKey || !credentials.secret || !credentials.passphrase) {
      console.error('[Place Order] Invalid credentials:', {
        hasApiKey: !!credentials.apiKey,
        hasSecret: !!credentials.secret,
        hasPassphrase: !!credentials.passphrase,
      })
      return NextResponse.json(
        { error: 'Invalid API credentials. Please re-authenticate with Polymarket.' },
        { status: 400 }
      )
    }

    const apiCredentials: PolymarketApiCredentials = {
      apiKey: credentials.apiKey,
      secret: credentials.secret,
      passphrase: credentials.passphrase,
    }
    
    console.log('[Place Order] Using credentials:', {
      apiKey: credentials.apiKey.substring(0, 10) + '...',
      secretLength: credentials.secret?.length,
      passphraseLength: credentials.passphrase?.length,
    })

    // Convert side to string format for API
    // The API docs say side should be a string "BUY" or "SELL"
    // Even though the SDK uses an enum internally, the API expects a string
    const sideString = signedOrder.side === 'BUY' || signedOrder.side === 0 ? 'BUY' : 'SELL'

    // Convert order type to SDK format
    const sdkOrderType = orderType.toUpperCase() as SDKOrderType

    console.log('[Place Order] Serializing order payload')
    console.log('[Place Order] Wallet address:', walletAddress)
    console.log('[Place Order] Order type:', sdkOrderType)

    // Serialize order payload matching SDK's orderToJson logic
    // The SDK converts salt using parseInt(salt, 10) - this may lose precision for 256-bit values
    // but this is what the SDK does, so we replicate it
    // Build order payload matching EXACTLY what the official SDK sends
    // See: node_modules/@polymarket/clob-client/dist/utilities.js orderToJson()
    const orderPayload = {
      deferExec: false, // SDK includes this field
      order: {
        salt: parseInt(signedOrder.salt, 10), // SDK uses parseInt - now safe with smaller salt
        maker: signedOrder.maker,
        signer: signedOrder.signer,
        taker: signedOrder.taker,
        tokenId: signedOrder.tokenId,
        makerAmount: signedOrder.makerAmount,
        takerAmount: signedOrder.takerAmount,
        side: sideString, // String: "BUY" or "SELL" (from SDK's Side enum)
        expiration: signedOrder.expiration,
        nonce: signedOrder.nonce,
        feeRateBps: signedOrder.feeRateBps,
        signatureType: signedOrder.signatureType,
        signature: signedOrder.signature,
      },
      owner: credentials.apiKey, // API key UUID
      orderType: sdkOrderType,
    }

    console.log('[Place Order] Order payload serialized')
    console.log('[Place Order] Full payload being sent:', JSON.stringify(orderPayload, null, 2))
    console.log('[Place Order] Payload preview:', {
      order: {
        salt: typeof orderPayload.order.salt,
        saltValue: orderPayload.order.salt,
        saltLength: orderPayload.order.salt.toString().length,
        side: orderPayload.order.side,
        sideType: typeof orderPayload.order.side,
      },
      owner: orderPayload.owner.substring(0, 10) + '...',
      orderType: orderPayload.orderType,
    })

    // Make authenticated request using our manual implementation
    // This ensures POLY_ADDRESS header uses the correct wallet address
    const response = await makeAuthenticatedRequest(
      'POST',
      '/order',
      walletAddress, // This will be used in POLY_ADDRESS header
      apiCredentials,
      orderPayload
    )

    console.log('[Place Order] Polymarket response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { errorMsg: errorText }
      }

      console.error('[Place Order] Polymarket error response:')
      console.error('  Status:', response.status)
      console.error('  Error data:', JSON.stringify(errorData, null, 2))
      console.error('[Place Order] Full payload that was sent:')
      console.error(JSON.stringify(orderPayload, null, 2))

      // If 401, it's likely an auth issue
      if (response.status === 401) {
        return NextResponse.json(
          {
            success: false,
            error: 'Authentication failed. Your API credentials may be expired or invalid. Please re-authenticate with Polymarket.',
            errorCode: 'AUTH_FAILED',
            details: errorData,
          },
          { status: 401 }
        )
      }

      // Map Polymarket error codes to user-friendly messages
      const errorMessages: Record<string, string> = {
        'INVALID_ORDER_MIN_TICK_SIZE': 'Order price breaks minimum tick size rules',
        'INVALID_ORDER_MIN_SIZE': 'Order size is below the minimum requirement',
        'INVALID_ORDER_DUPLICATED': 'This order has already been placed',
        'INVALID_ORDER_NOT_ENOUGH_BALANCE': 'Insufficient balance or allowance',
        'INVALID_ORDER_EXPIRATION': 'Order expiration is invalid',
        'INVALID_ORDER_ERROR': 'Could not insert order',
        'EXECUTION_ERROR': 'Could not execute trade',
        'ORDER_DELAYED': 'Order match delayed due to market conditions',
        'DELAYING_ORDER_ERROR': 'Error delaying the order',
        'FOK_ORDER_NOT_FILLED_ERROR': 'FOK order could not be fully filled',
        'MARKET_NOT_READY': 'Market is not yet ready to process new orders',
      }

      const errorCode = errorData.error || 'UNKNOWN_ERROR'
      const userMessage = errorMessages[errorCode] || errorData.errorMsg || `Failed to place order: ${response.status}`

      return NextResponse.json(
        {
          success: false,
          error: userMessage,
          errorCode: errorCode,
          details: errorData,
        },
        { status: response.status }
      )
    }

    const orderData = await response.json()

    console.log('[Place Order] Order placed successfully:', {
      success: orderData.success,
      orderId: orderData.orderId,
      status: orderData.status,
    })

    // Polymarket API returns: { success, errorMsg, orderId, orderHashes, status }
    return NextResponse.json({
      success: orderData.success !== false,
      orderId: orderData.orderId,
      orderHashes: orderData.orderHashes || [],
      status: orderData.status || 'unknown',
      message: orderData.errorMsg || 'Order placed successfully',
      data: orderData,
    })
  } catch (error: any) {
    console.error('[Place Order] Error:', error)
    
    // Extract error details from SDK errors
    let errorData: any = {}
    let errorMessage = error.message || 'Failed to place order'
    let statusCode = 500

    // Check if it's an API error with response data
    if (error.response?.data) {
      errorData = error.response.data
      errorMessage = errorData.errorMsg || errorData.error || errorMessage
      statusCode = error.response.status || 500
    } else if (error.data) {
      errorData = error.data
      errorMessage = errorData.errorMsg || errorData.error || errorMessage
      }

      // Map Polymarket error codes to user-friendly messages
      const errorMessages: Record<string, string> = {
        'INVALID_ORDER_MIN_TICK_SIZE': 'Order price breaks minimum tick size rules',
        'INVALID_ORDER_MIN_SIZE': 'Order size is below the minimum requirement',
        'INVALID_ORDER_DUPLICATED': 'This order has already been placed',
        'INVALID_ORDER_NOT_ENOUGH_BALANCE': 'Insufficient balance or allowance',
        'INVALID_ORDER_EXPIRATION': 'Order expiration is invalid',
        'INVALID_ORDER_ERROR': 'Could not insert order',
        'EXECUTION_ERROR': 'Could not execute trade',
        'ORDER_DELAYED': 'Order match delayed due to market conditions',
        'DELAYING_ORDER_ERROR': 'Error delaying the order',
        'FOK_ORDER_NOT_FILLED_ERROR': 'FOK order could not be fully filled',
        'MARKET_NOT_READY': 'Market is not yet ready to process new orders',
      }

      const errorCode = errorData.error || 'UNKNOWN_ERROR'
    const userMessage = errorMessages[errorCode] || errorMessage

    // If 401, it's likely an auth issue
    if (statusCode === 401) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication failed. Your API credentials may be expired or invalid. Please re-authenticate with Polymarket.',
          errorCode: 'AUTH_FAILED',
          details: errorData,
        },
        { status: 401 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: userMessage,
        errorCode: errorCode,
        details: errorData,
      },
      { status: statusCode }
    )
  }
}

