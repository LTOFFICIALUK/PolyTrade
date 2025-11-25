'use client'

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'

interface WebSocketContextType {
  isConnected: boolean
  sendMessage: (message: any) => void
  subscribe: (topic: string, callback: (data: any) => void) => () => void
  getLatestData: (topic: string) => any | null
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)

export const useWebSocket = () => {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider')
  }
  return context
}

interface WebSocketProviderProps {
  children: React.ReactNode
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)
  const subscribersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map())
  const latestDataRef = useRef<Map<string, any>>(new Map())
  const messageQueueRef = useRef<any[]>([])

  const WEBSOCKET_URL = process.env.NEXT_PUBLIC_WEBSOCKET_SERVER_URL || 'ws://localhost:8080'
  const MAX_RECONNECT_ATTEMPTS = 5
  const RECONNECT_DELAY = 3000

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    // Don't try to connect if we've exceeded max attempts
    if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
      return
    }

    try {
      const ws = new WebSocket(WEBSOCKET_URL)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
        reconnectAttempts.current = 0

        // Send any queued messages
        while (messageQueueRef.current.length > 0) {
          const message = messageQueueRef.current.shift()
          if (message) {
            ws.send(JSON.stringify(message))
          }
        }
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          // Handle different message types
          if (data.topic) {
            // Update latest data cache
            latestDataRef.current.set(data.topic, data.payload || data)
            
            // Notify all subscribers for this topic
            const subscribers = subscribersRef.current.get(data.topic)
            if (subscribers) {
              subscribers.forEach((callback) => {
                try {
                  callback(data.payload || data)
                } catch (error) {
                  console.error('Error in WebSocket subscriber callback:', error)
                }
              })
            }
          } else if (data.type === 'pong') {
            // Handle pong for keepalive
          } else {
            // Generic message handling
            console.log('WebSocket message:', data)
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      ws.onerror = (error) => {
        // Only log if we haven't exceeded max attempts (to reduce console noise)
        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          console.warn('WebSocket connection error (will retry):', error)
        }
        setIsConnected(false)
      }

      ws.onclose = (event) => {
        // Don't log normal closures or if we've exceeded max attempts
        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS && event.code !== 1000) {
          console.log('WebSocket disconnected, reconnecting...')
        }
        setIsConnected(false)
        wsRef.current = null

        // Attempt to reconnect
        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts.current++
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, RECONNECT_DELAY)
        }
      }
    } catch (error) {
      // Only log if we haven't exceeded max attempts
      if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
        console.warn('Failed to create WebSocket connection (will retry):', error)
      }
      setIsConnected(false)
    }
  }, [WEBSOCKET_URL])

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    } else {
      // Queue message for when connection is established
      messageQueueRef.current.push(message)
      // Try to connect if not already connecting
      if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
        connect()
      }
    }
  }, [connect])

  const subscribe = useCallback((topic: string, callback: (data: any) => void) => {
    // Add subscriber
    if (!subscribersRef.current.has(topic)) {
      subscribersRef.current.set(topic, new Set())
    }
    subscribersRef.current.get(topic)!.add(callback)

    // Send subscription message
    sendMessage({
      type: 'subscribe',
      topic: topic,
    })

    // Return unsubscribe function
    return () => {
      const subscribers = subscribersRef.current.get(topic)
      if (subscribers) {
        subscribers.delete(callback)
        if (subscribers.size === 0) {
          // Unsubscribe from server if no more subscribers
          sendMessage({
            type: 'unsubscribe',
            topic: topic,
          })
        }
      }
    }
  }, [sendMessage])

  const getLatestData = useCallback((topic: string) => {
    return latestDataRef.current.get(topic) || null
  }, [])

  useEffect(() => {
    connect()

    // Keepalive ping
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        sendMessage({ type: 'ping' })
      }
    }, 30000) // Every 30 seconds

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      clearInterval(pingInterval)
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [connect, sendMessage])

  const value: WebSocketContextType = {
    isConnected,
    sendMessage,
    subscribe,
    getLatestData,
  }

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>
}

