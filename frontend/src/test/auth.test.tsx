import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { LoginPage } from "@/pages/login"
import { PasswordSetupPage } from "@/pages/password-setup"
import { ProtectedRoute } from "@/components/protected-route"
import { AdminRoute } from "@/components/admin-route"
import { AuthProvider } from "@/context/auth-context"
import { ApiError } from "@/lib/api-client"
import { renderWithProviders } from "./test-utils"
import * as authApi from "@/api/auth"
import * as useAuthModule from "@/hooks/use-auth"

describe("Auth Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it("T-A1: Login form renders email and password inputs", () => {
    vi.spyOn(useAuthModule, "useAuth").mockReturnValue({
      user: null,
      isAdmin: false,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      setupPassword: vi.fn(),
      logout: vi.fn(),
      handleAuthCallback: vi.fn(),
    })

    renderWithProviders(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    )

    expect(screen.getByLabelText(/Email Address/i)).toBeDefined()
    expect(screen.getByLabelText(/^Password$/i)).toBeDefined()
    expect(screen.getByRole("button", { name: /^Sign in$/i })).toBeDefined()
  })

  it("T-A2: Login form submits and stores tokens on success", async () => {
    vi.spyOn(authApi, "login").mockResolvedValue({
      access_token: "mock-access-token",
      refresh_token: "mock-refresh-token",
      token_type: "bearer",
    })

    vi.spyOn(authApi, "getMe").mockResolvedValue({
      id: 1,
      email: "engineer@example.com",
      is_admin: false,
      created_at: "2026-09-08T00:00:00Z",
      failed_login_attempts: 0,
      locked_at: null,
    })

    renderWithProviders(
      <MemoryRouter initialEntries={["/login"]}>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: "engineer@example.com" },
    })
    fireEvent.change(screen.getByLabelText(/^Password$/i), {
      target: { value: "correctPassword123" },
    })

    fireEvent.click(screen.getByRole("button", { name: /^Sign in$/i }))

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({
        email: "engineer@example.com",
        password: "correctPassword123",
      })
      expect(localStorage.getItem("access_token")).toBe("mock-access-token")
      expect(localStorage.getItem("refresh_token")).toBe("mock-refresh-token")
    })
  })

  it("T-A3: Login form shows inline error on 401", async () => {
    vi.spyOn(authApi, "login").mockRejectedValue(
      new ApiError(401, "Invalid email or password"),
    )

    renderWithProviders(
      <MemoryRouter initialEntries={["/login"]}>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: "wrong@example.com" },
    })
    fireEvent.change(screen.getByLabelText(/^Password$/i), {
      target: { value: "wrongPassword" },
    })

    fireEvent.click(screen.getByRole("button", { name: /^Sign in$/i }))

    const alert = await screen.findByRole("alert")
    expect(alert.textContent).toContain("Invalid email or password")
  })

  it("T-A4: Login form shows locked error on 423", async () => {
    vi.spyOn(authApi, "login").mockRejectedValue(
      new ApiError(
        423,
        "Account is temporarily locked due to excessive failed attempts. Please retry in 15 minutes.",
      ),
    )

    renderWithProviders(
      <MemoryRouter initialEntries={["/login"]}>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: "locked@example.com" },
    })
    fireEvent.change(screen.getByLabelText(/^Password$/i), {
      target: { value: "failedPass123" },
    })

    fireEvent.click(screen.getByRole("button", { name: /^Sign in$/i }))

    const alert = await screen.findByRole("alert")
    expect(alert.textContent).toContain("Account is temporarily locked")
  })

  it("T-A5: Protected route redirects to /login when unauthenticated", () => {
    vi.spyOn(useAuthModule, "useAuth").mockReturnValue({
      user: null,
      isAdmin: false,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      setupPassword: vi.fn(),
      logout: vi.fn(),
      handleAuthCallback: vi.fn(),
    })

    renderWithProviders(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/login" element={<div>Login View</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>Dashboard View</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText("Login View")).toBeDefined()
    expect(screen.queryByText("Dashboard View")).toBeNull()
  })

  it("T-A6: Protected route renders children when authenticated", () => {
    vi.spyOn(useAuthModule, "useAuth").mockReturnValue({
      user: {
        id: 1,
        email: "authed@example.com",
        is_admin: false,
        created_at: "2026-09-08T00:00:00Z",
        failed_login_attempts: 0,
        locked_at: null,
      },
      isAdmin: false,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      setupPassword: vi.fn(),
      logout: vi.fn(),
      handleAuthCallback: vi.fn(),
    })

    renderWithProviders(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/login" element={<div>Login View</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>Dashboard View</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText("Dashboard View")).toBeDefined()
  })

  it("T-A7: Admin route redirects non-admin to /", () => {
    vi.spyOn(useAuthModule, "useAuth").mockReturnValue({
      user: {
        id: 5,
        email: "staff@example.com",
        is_admin: false,
        created_at: "2026-09-08T00:00:00Z",
        failed_login_attempts: 0,
        locked_at: null,
      },
      isAdmin: false,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      setupPassword: vi.fn(),
      logout: vi.fn(),
      handleAuthCallback: vi.fn(),
    })

    renderWithProviders(
      <MemoryRouter initialEntries={["/admin-only"]}>
        <Routes>
          <Route path="/" element={<div>Root View</div>} />
          <Route element={<AdminRoute />}>
            <Route path="/admin-only" element={<div>Admin Only View</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText("Root View")).toBeDefined()
    expect(screen.queryByText("Admin Only View")).toBeNull()
  })

  it("T-A15: Password setup form validates min 8 characters", async () => {
    const mockSetupPassword = vi.fn()
    vi.spyOn(useAuthModule, "useAuth").mockReturnValue({
      user: null,
      isAdmin: false,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      setupPassword: mockSetupPassword,
      logout: vi.fn(),
      handleAuthCallback: vi.fn(),
    })

    renderWithProviders(
      <MemoryRouter initialEntries={["/setup-password?token=valid-setup-token"]}>
        <PasswordSetupPage />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText(/New Password/i), {
      target: { value: "pass1" },
    })
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), {
      target: { value: "pass1" },
    })

    fireEvent.click(screen.getByRole("button", { name: /Complete Setup/i }))

    const alert = await screen.findByRole("alert")
    expect(alert.textContent).toContain("Password must be at least 8 characters long.")
    expect(mockSetupPassword).not.toHaveBeenCalled()
  })

  it("T-A16: Password setup form validates passwords match", async () => {
    const mockSetupPassword = vi.fn()
    vi.spyOn(useAuthModule, "useAuth").mockReturnValue({
      user: null,
      isAdmin: false,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      setupPassword: mockSetupPassword,
      logout: vi.fn(),
      handleAuthCallback: vi.fn(),
    })

    renderWithProviders(
      <MemoryRouter initialEntries={["/setup-password?token=valid-setup-token"]}>
        <PasswordSetupPage />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText(/New Password/i), {
      target: { value: "strongPassword123" },
    })
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), {
      target: { value: "differentPassword456" },
    })

    fireEvent.click(screen.getByRole("button", { name: /Complete Setup/i }))

    const alert = await screen.findByRole("alert")
    expect(alert.textContent).toContain("Passwords do not match.")
    expect(mockSetupPassword).not.toHaveBeenCalled()
  })
})
