import { useEffect, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { Appliance } from "@/types/appliance"
import type { WebSocketMessage } from "@/types/websocket"

export type ConnectionStatus = "CONNECTED" | "CONNECTING" | "DISCONNECTED"

export function useWebSocket() {
  const [status, setStatus] = useState<ConnectionStatus>("DISCONNECTED")
  const queryClient = useQueryClient()
  const socketRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)
  const backoffRef = useRef<number>(1000)

  useEffect(() => {
    let isMounted = true

    async function connect() {
      const token = await apiClient.getAccessToken()
      if (!token) {
        setStatus("DISCONNECTED")
        return
      }

      setStatus("CONNECTING")
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
      const wsUrl = `${protocol}//${window.location.host}/api/ws?token=${encodeURIComponent(token)}`

      const ws = new WebSocket(wsUrl)
      socketRef.current = ws

      ws.onopen = () => {
        if (!isMounted) return
        setStatus("CONNECTED")
        backoffRef.current = 1000
      }

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          if (message.event === "state_change") {
            queryClient.setQueryData<Appliance[]>(["appliances"], (old) => {
              if (!old) return old
              return old.map((appliance) =>
                appliance.id === message.appliance_id
                  ? {
                      ...appliance,
                      state: {
                        current_state: message.state,
                        last_changed_source: message.source,
                        last_changed_at: message.timestamp,
                      },
                    }
                  : appliance,
              )
            })
            queryClient.invalidateQueries({ queryKey: ["activity-log"] })
          } else if (message.event === "device_status") {
            queryClient.setQueryData(["device_status", message.device_id], message.status)
          }
        } catch {
        }
      }

      ws.onerror = () => {
        if (!isMounted) return
        ws.close()
      }

      ws.onclose = () => {
        if (!isMounted) return
        setStatus("DISCONNECTED")
        const delay = Math.min(backoffRef.current, 30000)
        backoffRef.current *= 2
        reconnectTimeoutRef.current = window.setTimeout(connect, delay)
      }
    }

    connect()

    return () => {
      isMounted = false
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (socketRef.current) {
        socketRef.current.close()
      }
    }
  }, [queryClient])

  return { status }
}
