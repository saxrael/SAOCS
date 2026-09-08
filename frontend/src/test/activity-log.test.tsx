import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen, waitFor } from "@testing-library/react"
import { ActivityLogPage } from "@/pages/activity-log"
import { renderWithProviders } from "./test-utils"
import * as activityLogApi from "@/api/activity-log"
import * as appliancesApi from "@/api/appliances"
import * as useAuthModule from "@/hooks/use-auth"
import type { ActivityLogEntry } from "@/types/activity-log"
import type { Appliance } from "@/types/appliance"

describe("Activity Log Suite", () => {
  const mockAppliances: Appliance[] = [
    {
      id: 1,
      name: "Main AC Unit",
      device_id: "esp32_c3_01",
      relay_channel: 1,
      assumed_wattage_watts: 2000,
      state: {
        current_state: "ON",
        last_changed_source: "manual",
        last_changed_at: "2026-09-08T10:00:00Z",
      },
    },
    {
      id: 2,
      name: "Water Dispenser",
      device_id: "esp32_c3_01",
      relay_channel: 2,
      assumed_wattage_watts: 500,
      state: {
        current_state: "OFF",
        last_changed_source: "schedule",
        last_changed_at: "2026-09-08T09:00:00Z",
      },
    },
  ]

  const mockLogs: ActivityLogEntry[] = [
    {
      id: 1,
      appliance_id: 1,
      appliance_name: "Main AC Unit",
      event_type: "POWER_ON",
      source: "manual",
      actor_user_id: 10,
      actor_email: "operator@example.com",
      timestamp: "2026-09-08T10:00:00.000Z",
    },
    {
      id: 2,
      appliance_id: 2,
      appliance_name: "Water Dispenser",
      event_type: "POWER_OFF",
      source: "schedule",
      actor_user_id: null,
      actor_email: null,
      timestamp: "2026-09-08T09:00:00.000Z",
    },
  ]

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
  })

  it("T-B4: Activity log renders entries in table format", async () => {
    vi.spyOn(activityLogApi, "listActivityLogs").mockResolvedValue(mockLogs)
    vi.spyOn(appliancesApi, "listAppliances").mockResolvedValue(mockAppliances)

    renderWithProviders(<ActivityLogPage />)

    const acElements = await screen.findAllByText("Main AC Unit")
    expect(acElements.length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText("Water Dispenser").length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText("POWER_ON")).toBeDefined()
    expect(screen.getByText("POWER_OFF")).toBeDefined()
    expect(screen.getByText("operator@example.com")).toBeDefined()
    expect(screen.getByText("—")).toBeDefined()

    expect(screen.getByText("Timestamp")).toBeDefined()
    expect(screen.getByText("Appliance")).toBeDefined()
    expect(screen.getByText("Event")).toBeDefined()
    expect(screen.getByText("Source")).toBeDefined()
    expect(screen.getByText("Actor")).toBeDefined()
  })

  it("T-B5: Activity log pagination loads next page", async () => {
    const fiftyLogs: ActivityLogEntry[] = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      appliance_id: 1,
      appliance_name: "Main AC Unit",
      event_type: "POWER_ON",
      source: "manual",
      actor_user_id: 1,
      actor_email: "test@example.com",
      timestamp: "2026-09-08T10:00:00.000Z",
    }))

    const listSpy = vi
      .spyOn(activityLogApi, "listActivityLogs")
      .mockImplementation(async (params) => {
        if (params?.offset === 0) return fiftyLogs
        return fiftyLogs.slice(0, 10)
      })
    vi.spyOn(appliancesApi, "listAppliances").mockResolvedValue(mockAppliances)

    renderWithProviders(<ActivityLogPage />)

    expect(await screen.findByText("Offset 0")).toBeDefined()

    const nextButton = screen.getByRole("button", { name: /^Next$/i })
    expect(nextButton).not.toBeDisabled()

    fireEvent.click(nextButton)

    expect(await screen.findByText("Offset 50")).toBeDefined()

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({ offset: 50, limit: 50 }),
      )
    })

    const prevButton = screen.getByRole("button", { name: /^Previous$/i })
    expect(prevButton).not.toBeDisabled()

    fireEvent.click(prevButton)

    expect(await screen.findByText("Offset 0")).toBeDefined()

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({ offset: 0, limit: 50 }),
      )
    })
  })

  it("T-B6: Activity log filter by appliance works", async () => {
    const listSpy = vi.spyOn(activityLogApi, "listActivityLogs").mockResolvedValue(mockLogs)
    vi.spyOn(appliancesApi, "listAppliances").mockResolvedValue(mockAppliances)

    renderWithProviders(<ActivityLogPage />)

    await screen.findByRole("option", { name: "Water Dispenser" })
    const filterSelect = screen.getByLabelText(/Filter by appliance/i)

    fireEvent.change(filterSelect, { target: { value: "2" } })

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({ appliance_id: 2, offset: 0 }),
      )
    })
  })

  it("T-B7: Export button only rendered for admin users", async () => {
    vi.spyOn(activityLogApi, "listActivityLogs").mockResolvedValue(mockLogs)
    vi.spyOn(appliancesApi, "listAppliances").mockResolvedValue(mockAppliances)

    const { unmount } = renderWithProviders(<ActivityLogPage />)

    expect(await screen.findByText(/Activity Audit Log/i)).toBeDefined()
    expect(screen.queryByRole("button", { name: /Export CSV/i })).toBeNull()

    unmount()

    vi.spyOn(useAuthModule, "useAuth").mockReturnValue({
      user: {
        id: 99,
        email: "admin@example.com",
        is_admin: true,
        created_at: "2026-09-08T00:00:00Z",
        failed_login_attempts: 0,
        locked_at: null,
      },
      isAdmin: true,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      setupPassword: vi.fn(),
      logout: vi.fn(),
      handleAuthCallback: vi.fn(),
    })

    const exportSpy = vi.spyOn(activityLogApi, "downloadExport").mockResolvedValue(undefined)

    renderWithProviders(<ActivityLogPage />)

    const exportButton = await screen.findByRole("button", { name: /Export CSV/i })
    expect(exportButton).toBeDefined()

    fireEvent.click(exportButton)

    await waitFor(() => {
      expect(exportSpy).toHaveBeenCalled()
    })
  })
})
