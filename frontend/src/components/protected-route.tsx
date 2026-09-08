import { Navigate, Outlet } from "react-router"
import { useAuth } from "@/hooks/use-auth"
import { LoadingSpinner } from "./loading-spinner"

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-(--color-background)">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
