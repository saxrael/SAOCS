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
  const pingIntervalRef = useRef<number | null>(null)

  useEffect(() => {
    let isMounted = true

    async function connect() {
      let token = await apiClient.getAccessToken()
      if (!token) {
        token = await apiClient.refreshAccessToken()
      }
      if (!token) {
        if (isMounted) setStatus("DISCONNECTED")
        return
      }

      if (isMounted) setStatus("CONNECTING")
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
      const wsUrl = `${protocol}//${window.location.host}/api/ws?token=${encodeURIComponent(token)}`

      const ws = new WebSocket(wsUrl)
      socketRef.current = ws

      ws.onopen = () => {
        if (!isMounted) return
        setStatus("CONNECTED")
        backoffRef.current = 1000
        queryClient.invalidateQueries({ queryKey: ["appliances"] })
        queryClient.invalidateQueries({ queryKey: ["activity-log"] })
        queryClient.invalidateQueries({ queryKey: ["schedules"] })

        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current)
        }
        pingIntervalRef.current = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            try {
              ws.send(JSON.stringify({ type: "ping" }))
            } catch {
              void 0
            }
          }
        }, 20000)
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
          } else if (message.event === "schedule_executed") {
            queryClient.invalidateQueries({ queryKey: ["schedules"] })
          }
        } catch {
        }
      }

      ws.onerror = () => {
        if (!isMounted) return
        ws.close()
      }

      ws.onclose = async (event) => {
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current)
          pingIntervalRef.current = null
        }
        if (!isMounted) return
        setStatus("DISCONNECTED")

        if (event.code === 1008) {
          const refreshed = await apiClient.refreshAccessToken()
          if (!refreshed) {
            return
          }
        }

        const delay = Math.min(backoffRef.current, 15000)
        backoffRef.current *= 2
        reconnectTimeoutRef.current = window.setTimeout(connect, delay)
      }
    }

    function handleVisibilityOrOnline() {
      if (document.visibilityState === "visible" || navigator.onLine) {
        if (socketRef.current?.readyState !== WebSocket.OPEN) {
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current)
            reconnectTimeoutRef.current = null
          }
          backoffRef.current = 1000
          connect()
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityOrOnline)
    window.addEventListener("online", handleVisibilityOrOnline)
    window.addEventListener("focus", handleVisibilityOrOnline)

    connect()

    return () => {
      isMounted = false
      document.removeEventListener("visibilitychange", handleVisibilityOrOnline)
      window.removeEventListener("online", handleVisibilityOrOnline)
      window.removeEventListener("focus", handleVisibilityOrOnline)
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current)
      }
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
