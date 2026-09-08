import { Navigate, Outlet } from "react-router"
import { useAuth } from "@/hooks/use-auth"

export function AdminRoute() {
  const { isAdmin } = useAuth()

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
