import { createBrowserRouter } from "react-router"
import { Layout } from "./layout"
import { ProtectedRoute } from "@/components/protected-route"
import { AdminRoute } from "@/components/admin-route"
import { LoginPage } from "@/pages/login"
import { PasswordSetupPage } from "@/pages/password-setup"
import { DashboardPage } from "@/pages/dashboard"
import { SchedulePage } from "@/pages/schedule"
import { ActivityLogPage } from "@/pages/activity-log"
import { ManageUsersPage } from "@/pages/manage-users"
import { NotFoundPage } from "@/pages/not-found"

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/setup-password",
    element: <PasswordSetupPage />,
  },
  {
    path: "/auth/callback",
    element: <LoginPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <Layout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: "schedule", element: <SchedulePage /> },
          { path: "activity-log", element: <ActivityLogPage /> },
          {
            element: <AdminRoute />,
            children: [
              { path: "manage-users", element: <ManageUsersPage /> },
            ],
          },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
])
