import { beforeEach, describe, expect, it, vi } from "vitest"
import { act, fireEvent, screen, waitFor } from "@testing-library/react"
import { DashboardPage } from "@/pages/dashboard"
import { ApplianceTile } from "@/components/appliance-tile"
import { ConnectionStatusBanner } from "@/components/connection-status-banner"
import { computeDailyEnergy } from "@/lib/utils"
import { TARIFF_RATE_PER_KWH } from "@/lib/constants"
import { renderWithProviders } from "./test-utils"
import * as appliancesApi from "@/api/appliances"
import * as activityLogApi from "@/api/activity-log"
import type { Appliance } from "@/types/appliance"
import type { ActivityLogEntry } from "@/types/activity-log"

describe("Dashboard Suite", () => {
  const mockAppliances: Appliance[] = [
    {
      id: 1,
      name: "Air Conditioner",
      device_id: "esp32_c3_01",
      relay_channel: 1,
      assumed_wattage_watts: 1500,
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

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("T-A8: Dashboard renders appliance tiles from API data", async () => {
    vi.spyOn(appliancesApi, "listAppliances").mockResolvedValue(mockAppliances)
    vi.spyOn(activityLogApi, "listActivityLogs").mockResolvedValue([])

    renderWithProviders(<DashboardPage />)

    expect(await screen.findByText("Air Conditioner")).toBeDefined()
    expect(screen.getByText("Water Dispenser")).toBeDefined()
    expect(screen.getByText(/Channel 1 • 1500W/i)).toBeDefined()
    expect(screen.getByText(/Channel 2 • 500W/i)).toBeDefined()
  })

  it("T-A9: Appliance tile shows ON state with teal indicator", () => {
    const { container } = renderWithProviders(
      <ApplianceTile appliance={mockAppliances[0]} />,
    )

    expect(screen.getByText("Air Conditioner")).toBeDefined()
    expect(screen.getByText("ON")).toBeDefined()
    expect(screen.getByRole("button", { name: /Toggle Air Conditioner/i }).textContent).toContain(
      "Turn Off",
    )

    const indicator = container.querySelector(".rounded-full.bg-\\(--color-accent\\)")
    expect(indicator).not.toBeNull()
  })

  it("T-A10: Appliance tile shows OFF state with muted indicator", () => {
    const { container } = renderWithProviders(
      <ApplianceTile appliance={mockAppliances[1]} />,
    )

    expect(screen.getByText("Water Dispenser")).toBeDefined()
    expect(screen.getByText("OFF")).toBeDefined()
    expect(screen.getByRole("button", { name: /Toggle Water Dispenser/i }).textContent).toContain(
      "Turn On",
    )

    const indicator = container.querySelector(".rounded-full.bg-slate-500")
    expect(indicator).not.toBeNull()
  })

  it("T-A11: Toggle button enters pending state on click", async () => {
    let resolver: (value: unknown) => void = () => {}
    const pendingPromise = new Promise((resolve) => {
      resolver = resolve
    })

    vi.spyOn(appliancesApi, "commandAppliance").mockReturnValue(
      pendingPromise as ReturnType<typeof appliancesApi.commandAppliance>,
    )

    renderWithProviders(<ApplianceTile appliance={mockAppliances[1]} />)

    const button = screen.getByRole("button", { name: /Toggle Water Dispenser/i })
    expect(button).not.toBeDisabled()

    fireEvent.click(button)

    await waitFor(() => {
      expect(button).toBeDisabled()
      expect(button.querySelector(".animate-spin")).not.toBeNull()
    })

    await act(async () => {
      resolver({ status: "queued", appliance_id: 2, target_state: "ON" })
    })
  })

  it("T-A12: Toggle mutation sends correct command to API", async () => {
    const commandSpy = vi
      .spyOn(appliancesApi, "commandAppliance")
      .mockResolvedValue({ status: "queued", appliance_id: 2, target_state: "ON" })

    renderWithProviders(<ApplianceTile appliance={mockAppliances[1]} />)

    const button = screen.getByRole("button", { name: /Toggle Water Dispenser/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(commandSpy).toHaveBeenCalledWith(2, { state: "ON" })
    })

    commandSpy.mockResolvedValueOnce({
      status: "queued",
      appliance_id: 1,
      target_state: "OFF",
    })

    renderWithProviders(<ApplianceTile appliance={mockAppliances[0]} />)

    const onButton = screen.getByRole("button", { name: /Toggle Air Conditioner/i })
    fireEvent.click(onButton)

    await waitFor(() => {
      expect(commandSpy).toHaveBeenCalledWith(1, { state: "OFF" })
    })
  })

  it("T-A13: Connection banner shows 'Disconnected' when WS is closed", () => {
    renderWithProviders(<ConnectionStatusBanner status="DISCONNECTED" />)

    expect(screen.getByRole("status")).toBeDefined()
    expect(
      screen.getByText(/Disconnected from broker. Live updates paused; data may be outdated./i),
    ).toBeDefined()
  })

  it("T-A14: Connection banner shows 'Connected' when WS is open", () => {
    const { container } = renderWithProviders(<ConnectionStatusBanner status="CONNECTED" />)

    expect(container.firstChild).toBeNull()
    expect(screen.queryByRole("status")).toBeNull()
    expect(screen.queryByText(/Disconnected from broker/i)).toBeNull()
  })

  it("T-B10: Energy estimate calculates correctly from mock data", async () => {
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 3600000).toISOString()
    const thirtyMinAgo = new Date(now.getTime() - 1800000).toISOString()

    const mockLogs: ActivityLogEntry[] = [
      {
        id: 1,
        appliance_id: 1,
        appliance_name: "Air Conditioner",
        event_type: "POWER_ON",
        source: "manual",
        actor_user_id: 1,
        actor_email: "test@example.com",
        timestamp: oneHourAgo,
      },
      {
        id: 2,
        appliance_id: 1,
        appliance_name: "Air Conditioner",
        event_type: "POWER_OFF",
        source: "manual",
        actor_user_id: 1,
        actor_email: "test@example.com",
        timestamp: thirtyMinAgo,
      },
    ]

    const { totalKwh, totalCost } = computeDailyEnergy([mockAppliances[0]], mockLogs)
    expect(totalKwh).toBeCloseTo(0.75, 2)
    expect(totalCost).toBeCloseTo(0.75 * TARIFF_RATE_PER_KWH, 2)

    vi.spyOn(appliancesApi, "listAppliances").mockResolvedValue([mockAppliances[0]])
    vi.spyOn(activityLogApi, "listActivityLogs").mockResolvedValue(mockLogs)

    renderWithProviders(<DashboardPage />)

    expect(await screen.findByText(/Est. Today Energy/i)).toBeDefined()
    expect(screen.getByText(/Est. Cost \(Band A\)/i)).toBeDefined()
    expect(screen.getByText(new RegExp(totalKwh.toFixed(2)))).toBeDefined()
    expect(screen.getByText(new RegExp(totalCost.toFixed(2)))).toBeDefined()
  })
})
