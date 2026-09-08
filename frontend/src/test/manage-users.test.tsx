import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { ManageUsersPage } from "@/pages/manage-users"
import { AdminRoute } from "@/components/admin-route"
import { ApiError } from "@/lib/api-client"
import { renderWithProviders } from "./test-utils"
import * as usersApi from "@/api/users"
import * as useAuthModule from "@/hooks/use-auth"
import type { User } from "@/types/user"

describe("Manage Users Suite", () => {
  const mockUsers: User[] = [
    {
      id: 1,
      email: "admin@example.com",
      is_admin: true,
      created_at: "2026-09-08T00:00:00Z",
      failed_login_attempts: 0,
      locked_at: null,
    },
    {
      id: 2,
      email: "engineer@example.com",
      is_admin: false,
      created_at: "2026-09-08T01:00:00Z",
      failed_login_attempts: 0,
      locked_at: null,
    },
  ]

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("T-B8: Manage Users page registers new user", async () => {
    vi.spyOn(useAuthModule, "useAuth").mockReturnValue({
      user: mockUsers[0],
      isAdmin: true,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      setupPassword: vi.fn(),
      logout: vi.fn(),
      handleAuthCallback: vi.fn(),
    })
    vi.spyOn(usersApi, "listUsers").mockResolvedValue(mockUsers)
    const registerSpy = vi.spyOn(usersApi, "registerUser").mockResolvedValue({
      id: 3,
      email: "newmember@example.com",
      is_admin: true,
      created_at: "2026-09-08T02:00:00Z",
      failed_login_attempts: 0,
      locked_at: null,
    })

    renderWithProviders(<ManageUsersPage />)

    expect(await screen.findByText("admin@example.com")).toBeDefined()

    fireEvent.change(screen.getByLabelText(/Google Account Email/i), {
      target: { value: "newmember@example.com" },
    })
    fireEvent.click(screen.getByLabelText(/Grant Administrator Role/i))

    fireEvent.click(screen.getByRole("button", { name: /Register User/i }))

    await waitFor(() => {
      expect(registerSpy).toHaveBeenCalled()
    })

    expect(registerSpy.mock.calls[0][0]).toEqual({
      email: "newmember@example.com",
      is_admin: true,
    })
  })

  it("T-B9: Manage Users shows error on duplicate email", async () => {
    vi.spyOn(useAuthModule, "useAuth").mockReturnValue({
      user: mockUsers[0],
      isAdmin: true,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      setupPassword: vi.fn(),
      logout: vi.fn(),
      handleAuthCallback: vi.fn(),
    })
    vi.spyOn(usersApi, "listUsers").mockResolvedValue(mockUsers)
    vi.spyOn(usersApi, "registerUser").mockRejectedValue(
      new ApiError(409, "User with this email already exists"),
    )

    renderWithProviders(<ManageUsersPage />)

    expect(await screen.findByText("admin@example.com")).toBeDefined()

    fireEvent.change(screen.getByLabelText(/Google Account Email/i), {
      target: { value: "admin@example.com" },
    })

    fireEvent.click(screen.getByRole("button", { name: /Register User/i }))

    const alert = await screen.findByRole("alert")
    expect(alert.textContent).toContain("User with this email already exists")
  })

  it("T-B11: Non-admin cannot access /manage-users route", () => {
    vi.spyOn(useAuthModule, "useAuth").mockReturnValue({
      user: mockUsers[1],
      isAdmin: false,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      setupPassword: vi.fn(),
      logout: vi.fn(),
      handleAuthCallback: vi.fn(),
    })

    renderWithProviders(
      <MemoryRouter initialEntries={["/manage-users"]}>
        <Routes>
          <Route path="/" element={<div>Dashboard Root</div>} />
          <Route element={<AdminRoute />}>
            <Route path="/manage-users" element={<ManageUsersPage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText("Dashboard Root")).toBeDefined()
    expect(screen.queryByText("User Access Management")).toBeNull()
  })
})
