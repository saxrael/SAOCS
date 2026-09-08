import type { ConnectionStatus } from "@/hooks/use-websocket"

export function ConnectionStatusBanner({ status }: { status: ConnectionStatus }) {
  if (status === "CONNECTED") return null

  const isConnecting = status === "CONNECTING"

  return (
    <div
      role="status"
      className={`w-full py-2 px-4 text-xs font-medium text-center flex items-center justify-center gap-2 transition-colors ${
        isConnecting
          ? "bg-amber-950/90 border-b border-(--color-warning) text-amber-200"
          : "bg-red-950/90 border-b border-(--color-destructive) text-red-200"
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full ${
          isConnecting ? "bg-(--color-warning) animate-pulse" : "bg-(--color-destructive)"
        }`}
      />
      <span>
        {isConnecting
          ? "Reconnecting to real-time service..."
          : "Disconnected from broker. Live updates paused; data may be outdated."}
      </span>
    </div>
  )
}
