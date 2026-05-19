'use client'
import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/lib/store'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/ws'

type Handler = (data: unknown) => void
const handlers = new Map<string, Handler[]>()

export const onWsEvent = (type: string, handler: Handler) => {
  if (!handlers.has(type)) handlers.set(type, [])
  handlers.get(type)!.push(handler)
  return () => {
    const list = handlers.get(type) || []
    handlers.set(type, list.filter(h => h !== handler))
  }
}

let wsInstance: WebSocket | null = null
let authenticated = false

export const useWebSocket = () => {
  const { token } = useAuthStore()
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!token || wsInstance?.readyState === WebSocket.OPEN) return

    const connect = () => {
      const ws = new WebSocket(WS_URL)
      wsInstance = ws
      wsRef.current = ws

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'AUTH', token }))
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'AUTH_OK') authenticated = true
          const eventHandlers = handlers.get(msg.type) || []
          eventHandlers.forEach(h => h(msg.data || msg))
        } catch { /* ignore */ }
      }

      ws.onclose = () => {
        authenticated = false
        wsInstance = null
        if (token) setTimeout(connect, 3000)
      }

      ws.onerror = () => ws.close()
    }

    connect()
    return () => {
      wsRef.current?.close()
    }
  }, [token])

  return { authenticated }
}
