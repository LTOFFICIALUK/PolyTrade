'use client'

import { useEffect, useState } from 'react'
import { useWebSocket } from '@/contexts/WebSocketContext'

interface UseWebSocketDataOptions {
  topic: string
  initialData?: any
  enabled?: boolean
}

export const useWebSocketData = <T = any>({ topic, initialData, enabled = true }: UseWebSocketDataOptions) => {
  const { isConnected, subscribe, getLatestData } = useWebSocket()
  const [data, setData] = useState<T | null>(initialData || getLatestData(topic) || null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!enabled) return

    // Get initial data if available
    const latest = getLatestData(topic)
    if (latest) {
      setData(latest)
    }

    // Subscribe to updates
    const unsubscribe = subscribe(topic, (newData: T) => {
      setData(newData)
      setError(null)
    })

    return unsubscribe
  }, [topic, enabled, subscribe, getLatestData])

  return { data, error, isConnected }
}

