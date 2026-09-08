import { beforeEach, describe, expect, it, vi } from "vitest"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ApplianceTile } from "@/components/appliance-tile"
import { ToggleButton } from "@/components/toggle-button"
import { ConnectionStatusBanner } from "@/components/connection-status-banner"
import { DashboardPage } from "@/pages/dashboard"
import { LoginPage } from "@/pages/login"
import { PasswordSetupPage } from "@/pages/password-setup"
import { SchedulePage } from "@/pages/schedule"
import { ActivityLogPage } from "@/pages/activity-log"
import { ManageUsersPage } from "@/pages/manage-users"
import { AuthProvider } from "@/context/auth-context"
import { apiClient, ApiError } from "@/lib/api-client"
import * as appliancesApi from "@/api/appliances"
import * as activityLogApi from "@/api/activity-log"
import * as schedulesApi from "@/api/schedules"
import * as usersApi from "@/api/users"
import * as authApi from "@/api/auth"
import * as useAuthModule from "@/hooks/use-auth"
import type { Appliance } from "@/types/appliance"
import type { ActivityLogEntry } from "@/types/activity-log"
import type { User } from "@/types/user"

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

function renderWithClient(ui: React.ReactElement, queryClient = createTestQueryClient()) {
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  )
}

describe("Adversarial Stress Suite — Toggle & Debounce", () => {
  const sampleAppliance: Appliance = {
    id: 10,
    name: "HVAC Unit",
    device_id: "esp32_c3_01",
    relay_channel: 1,
    assumed_wattage_watts: 2200,
    state: {
      current_state: "OFF",
      last_changed_source: "manual",
      last_changed_at: "2026-09-08T00:00:00Z",
    },
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it("rapid clicking ToggleButton while loading does not dispatch multiple clicks", () => {
    const handleClick = vi.fn()
    const { rerender } = render(
      <ToggleButton
        isOn={false}
        isLoading={false}
        onClick={handleClick}
        ariaLabel="Toggle appliance"
      />,
    )

    const button = screen.getByRole("button", { name: "Toggle appliance" })
    fireEvent.click(button)
    expect(handleClick).toHaveBeenCalledTimes(1)

    rerender(
      <ToggleButton
        isOn={false}
        isLoading={true}
        onClick={handleClick}
        ariaLabel="Toggle appliance"
      />,
    )

    expect(button).toBeDisabled()
    fireEvent.click(button)
    fireEvent.click(button)
    fireEvent.click(button)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it("ApplianceTile enters disabled pending state and prevents concurrent command dispatch", async () => {
    let resolveCommand: (value: unknown) => void = () => {}
    const inflightPromise = new Promise((resolve) => {
      resolveCommand = resolve
    })

    const commandSpy = vi
      .spyOn(appliancesApi, "commandAppliance")
      .mockReturnValue(inflightPromise as ReturnType<typeof appliancesApi.commandAppliance>)

    renderWithClient(<ApplianceTile appliance={sampleAppliance} />)

    const button = screen.getByRole("button", { name: /Toggle HVAC Unit/i })
    expect(button).not.toBeDisabled()

    fireEvent.click(button)

    await waitFor(() => {
      expect(commandSpy).toHaveBeenCalledTimes(1)
      expect(commandSpy).toHaveBeenCalledWith(10, { state: "ON" })
      expect(button).toBeDisabled()
      expect(button.querySelector(".animate-spin")).not.toBeNull()
    })

    fireEvent.click(button)
    fireEvent.click(button)
    expect(commandSpy).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolveCommand({ status: "command_published", appliance_id: 10, target_state: "ON" })
    })

    await waitFor(() => {
      expect(button).not.toBeDisabled()
    })
  })

  it("ApplianceTile re-enables button and displays specific error when command fails", async () => {
    vi.spyOn(appliancesApi, "commandAppliance").mockRejectedValue(
      new ApiError(500, "Broker timeout"),
    )

    renderWithClient(<ApplianceTile appliance={sampleAppliance} />)

    const button = screen.getByRole("button", { name: /Toggle HVAC Unit/i })
    fireEvent.click(button)

    const alert = await screen.findByRole("alert")
    expect(alert.textContent).toContain("Failed to turn on HVAC Unit: Broker timeout")
    expect(button).not.toBeDisabled()
  })
})

describe("Adversarial Stress Suite — Error Responses & Network Failure", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it("apiClient clears tokens and throws on 401 when refresh fails", async () => {
    localStorage.setItem("access_token", "expired-token")
    localStorage.setItem("refresh_token", "invalid-refresh")

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        status: 401,
        ok: false,
        json: async () => ({ detail: "Token expired" }),
      })
      .mockResolvedValueOnce({
        status: 401,
        ok: false,
        json: async () => ({ detail: "Invalid refresh token" }),
      })

    vi.stubGlobal("fetch", mockFetch)

    await expect(apiClient.get("/appliances/")).rejects.toThrow(ApiError)
    expect(localStorage.getItem("access_token")).toBeNull()
    expect(localStorage.getItem("refresh_token")).toBeNull()

    vi.unstubAllGlobals()
  })

  it("apiClient handles 403 Forbidden without crashing", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 403,
      ok: false,
      json: async () => ({ detail: "Administrator privileges required" }),
    })
    vi.stubGlobal("fetch", mockFetch)

    try {
      await apiClient.get("/users/")
      expect.unreachable()
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
      const apiErr = err as ApiError
      expect(apiErr.status).toBe(403)
      expect(apiErr.detail).toBe("Administrator privileges required")
    }

    vi.unstubAllGlobals()
  })

  it("LoginPage surfaces 423 Account Locked error message", async () => {
    vi.spyOn(authApi, "login").mockRejectedValue(
      new ApiError(423, "Account is locked due to too many failed attempts. Unlock via Google OAuth."),
    )

    renderWithClient(
      <MemoryRouter initialEntries={["/login"]}>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: "operator@example.com" },
    })
    fireEvent.change(screen.getByLabelText(/^Password$/i), {
      target: { value: "wrongPass123" },
    })
    fireEvent.click(screen.getByRole("button", { name: /^Sign in$/i }))

    const alert = await screen.findByRole("alert")
    expect(alert.textContent).toContain("Account is locked due to too many failed attempts")
  })

  it("DashboardPage displays error inline when appliances query fails with 500", async () => {
    vi.spyOn(appliancesApi, "listAppliances").mockRejectedValue(
      new ApiError(500, "Internal Server Error"),
    )
    vi.spyOn(activityLogApi, "listActivityLogs").mockResolvedValue([])

    renderWithClient(<DashboardPage />)

    const alert = await screen.findByRole("alert")
    expect(alert.textContent).toContain("Failed to load appliances. Please check your network connection.")
  })

  it("ManageUsersPage surfaces 500 error on registration failure", async () => {
    const mockAdmin: User = {
      id: 1,
      email: "admin@example.com",
      is_admin: true,
      created_at: "2026-09-08T00:00:00Z",
      failed_login_attempts: 0,
      locked_at: null,
    }

    vi.spyOn(useAuthModule, "useAuth").mockReturnValue({
      user: mockAdmin,
      isAdmin: true,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      setupPassword: vi.fn(),
      logout: vi.fn(),
      handleAuthCallback: vi.fn(),
    })
    vi.spyOn(usersApi, "listUsers").mockResolvedValue([mockAdmin])
    vi.spyOn(usersApi, "registerUser").mockRejectedValue(
      new ApiError(500, "Database connection failure"),
    )

    renderWithClient(<ManageUsersPage />)

    await screen.findByText("admin@example.com")

    fireEvent.change(screen.getByLabelText(/Google Account Email/i), {
      target: { value: "test@example.com" },
    })
    fireEvent.click(screen.getByRole("button", { name: /Register User/i }))

    const alert = await screen.findByRole("alert")
    expect(alert.textContent).toContain("Database connection failure")
  })
})

describe("Adversarial Stress Suite — WebSocket Transitions & Cache Updates", () => {
  it("ConnectionStatusBanner renders correct visual state across status transitions", () => {
    const { rerender } = render(<ConnectionStatusBanner status="DISCONNECTED" />)
    expect(screen.getByRole("status")).toBeDefined()
    expect(screen.getByText(/Disconnected from broker/i)).toBeDefined()

    rerender(<ConnectionStatusBanner status="CONNECTING" />)
    expect(screen.getByRole("status")).toBeDefined()
    expect(screen.getByText(/Reconnecting to real-time service/i)).toBeDefined()

    rerender(<ConnectionStatusBanner status="CONNECTED" />)
    expect(screen.queryByRole("status")).toBeNull()
  })

  it("QueryClient cache updates single appliance state on websocket state_change event without clobbering other appliances", () => {
    const queryClient = createTestQueryClient()
    const initialAppliances: Appliance[] = [
      {
        id: 1,
        name: "Light A",
        device_id: "esp32_c3_01",
        relay_channel: 1,
        assumed_wattage_watts: 60,
        state: {
          current_state: "OFF",
          last_changed_source: "manual",
          last_changed_at: "2026-09-08T01:00:00Z",
        },
      },
      {
        id: 2,
        name: "Light B",
        device_id: "esp32_c3_01",
        relay_channel: 2,
        assumed_wattage_watts: 60,
        state: {
          current_state: "OFF",
          last_changed_source: "manual",
          last_changed_at: "2026-09-08T01:00:00Z",
        },
      },
    ]

    queryClient.setQueryData(["appliances"], initialAppliances)

    const wsEvent = {
      event: "state_change" as const,
      appliance_id: 1,
      device_id: "esp32_c3_01",
      channel: 1,
      state: "ON" as const,
      source: "switch_physical",
      timestamp: "2026-09-08T02:00:00Z",
    }

    queryClient.setQueryData<Appliance[]>(["appliances"], (old) => {
      if (!old) return old
      return old.map((appliance) =>
        appliance.id === wsEvent.appliance_id
          ? {
              ...appliance,
              state: {
                current_state: wsEvent.state,
                last_changed_source: wsEvent.source,
                last_changed_at: wsEvent.timestamp,
              },
            }
          : appliance,
      )
    })

    const updated = queryClient.getQueryData<Appliance[]>(["appliances"])
    expect(updated).toBeDefined()
    expect(updated![0].state?.current_state).toBe("ON")
    expect(updated![0].state?.last_changed_source).toBe("switch_physical")
    expect(updated![1].state?.current_state).toBe("OFF")
  })
})

describe("Adversarial Stress Suite — Form Boundaries", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it("PasswordSetupPage accepts password of exactly 8 characters", async () => {
    const mockSetupPassword = vi.fn().mockResolvedValue(undefined)
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

    renderWithClient(
      <MemoryRouter initialEntries={["/setup-password?token=valid-setup-token"]}>
        <PasswordSetupPage />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText(/New Password/i), {
      target: { value: "12345678" },
    })
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), {
      target: { value: "12345678" },
    })
    fireEvent.click(screen.getByRole("button", { name: /Complete Setup/i }))

    await waitFor(() => {
      expect(mockSetupPassword).toHaveBeenCalledWith(
        { password: "12345678" },
        "valid-setup-token",
      )
    })
  })

  it("SchedulePage rejects submission when appliance or time is missing", async () => {
    vi.spyOn(schedulesApi, "listSchedules").mockResolvedValue([])
    vi.spyOn(appliancesApi, "listAppliances").mockResolvedValue([])
    const createSpy = vi.spyOn(schedulesApi, "createSchedule")

    renderWithClient(<SchedulePage />)

    const newButton = await screen.findByRole("button", { name: /New Schedule/i })
    fireEvent.click(newButton)

    const submitButton = screen.getByRole("button", { name: /Save Schedule/i })
    fireEvent.submit(submitButton.closest("form")!)

    const alert = await screen.findByRole("alert")
    expect(alert.textContent).toContain("Please select an appliance and scheduled time.")
    expect(createSpy).not.toHaveBeenCalled()
  })
})

describe("Adversarial Stress Suite — Activity Log Pagination Edge Cases", () => {
  const fiftyLogs: ActivityLogEntry[] = Array.from({ length: 50 }, (_, i) => ({
    id: i + 1,
    appliance_id: 1,
    appliance_name: "Appliance 1",
    event_type: "POWER_ON",
    source: "manual",
    actor_user_id: 1,
    actor_email: "test@example.com",
    timestamp: "2026-09-08T10:00:00.000Z",
  }))

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(useAuthModule, "useAuth").mockReturnValue({
      user: {
        id: 1,
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
    vi.spyOn(appliancesApi, "listAppliances").mockResolvedValue([])
  })

  it("disables Previous button at offset 0", async () => {
    vi.spyOn(activityLogApi, "listActivityLogs").mockResolvedValue(fiftyLogs)

    renderWithClient(<ActivityLogPage />)

    expect(await screen.findByText("Offset 0")).toBeDefined()
    const prevButton = screen.getByRole("button", { name: /^Previous$/i })
    expect(prevButton).toBeDisabled()
  })

  it("disables Next button when response has fewer items than limit", async () => {
    vi.spyOn(activityLogApi, "listActivityLogs").mockResolvedValue(fiftyLogs.slice(0, 20))

    renderWithClient(<ActivityLogPage />)

    expect(await screen.findByText("Offset 0")).toBeDefined()
    const nextButton = screen.getByRole("button", { name: /^Next$/i })
    expect(nextButton).toBeDisabled()
  })

  it("investigates pagination behavior when next page returns empty list", async () => {
    const listSpy = vi
      .spyOn(activityLogApi, "listActivityLogs")
      .mockImplementation(async (params) => {
        if (params?.offset === 0) return fiftyLogs
        return []
      })

    renderWithClient(<ActivityLogPage />)

    expect(await screen.findByText("Offset 0")).toBeDefined()
    const nextButton = screen.getByRole("button", { name: /^Next$/i })
    expect(nextButton).not.toBeDisabled()

    fireEvent.click(nextButton)

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({ offset: 50, limit: 50 }),
      )
    })

    expect(
      screen.queryByText("No audit entries recorded for the current filter."),
    ).toBeNull()

    const prevButtonAfterEmpty = await screen.findByRole("button", { name: /^Previous$/i })
    expect(prevButtonAfterEmpty).not.toBeDisabled()

    fireEvent.click(prevButtonAfterEmpty)

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({ offset: 0, limit: 50 }),
      )
    })

    expect(await screen.findByText("Offset 0")).toBeDefined()
  })
})
