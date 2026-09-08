import { Outlet } from "react-router"
import { ConnectionStatusBanner } from "@/components/connection-status-banner"
import { NavBar } from "@/components/nav-bar"
import { useWebSocket } from "@/hooks/use-websocket"

export function Layout() {
  const { status } = useWebSocket()

  return (
    <div className="min-h-screen bg-(--color-background) text-(--color-foreground) flex flex-col font-(--font-sans)">
      <ConnectionStatusBanner status={status} />
      <NavBar />
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 pb-24 md:pb-8">
        <Outlet />
      </main>
    </div>
  )
}
