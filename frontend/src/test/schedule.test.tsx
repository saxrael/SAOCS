import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, screen, waitFor } from "@testing-library/react"
import { SchedulePage } from "@/pages/schedule"
import { renderWithProviders } from "./test-utils"
import * as schedulesApi from "@/api/schedules"
import * as appliancesApi from "@/api/appliances"
import type { Schedule } from "@/types/schedule"
import type { Appliance } from "@/types/appliance"

describe("Schedule Suite", () => {
  const mockAppliances: Appliance[] = [
    {
      id: 1,
      name: "Conference Room Lights",
      device_id: "esp32_c3_01",
      relay_channel: 1,
      assumed_wattage_watts: 100,
      state: {
        current_state: "OFF",
        last_changed_source: "manual",
        last_changed_at: "2026-09-08T08:00:00Z",
      },
    },
    {
      id: 2,
      name: "Water Heater",
      device_id: "esp32_c3_01",
      relay_channel: 2,
      assumed_wattage_watts: 2000,
      state: {
        current_state: "ON",
        last_changed_source: "schedule",
        last_changed_at: "2026-09-08T07:00:00Z",
      },
    },
  ]

  const mockSchedules: Schedule[] = [
    {
      id: 101,
      appliance_id: 1,
      action: "ON",
      scheduled_time: "2026-09-08T18:00:00.000Z",
      created_by: 1,
      created_at: "2026-09-08T06:00:00.000Z",
      executed_at: null,
    },
    {
      id: 102,
      appliance_id: 2,
      action: "OFF",
      scheduled_time: "2026-09-08T19:30:00.000Z",
      created_by: 1,
      created_at: "2026-09-08T06:00:00.000Z",
      executed_at: "2026-09-08T19:30:05.000Z",
    },
  ]

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("T-B1: Schedule page renders list of schedules", async () => {
    vi.spyOn(schedulesApi, "listSchedules").mockResolvedValue(mockSchedules)
    vi.spyOn(appliancesApi, "listAppliances").mockResolvedValue(mockAppliances)

    renderWithProviders(<SchedulePage />)

    expect(await screen.findByText("Conference Room Lights")).toBeDefined()
    expect(screen.getByText("Water Heater")).toBeDefined()
    expect(screen.getByText("Pending")).toBeDefined()
    expect(screen.getByText("Executed")).toBeDefined()
    expect(screen.getAllByText("ON").length).toBeGreaterThan(0)
    expect(screen.getAllByText("OFF").length).toBeGreaterThan(0)
  })

  it("T-B2: Schedule form creates and refreshes list", async () => {
    vi.spyOn(schedulesApi, "listSchedules").mockResolvedValue(mockSchedules)
    vi.spyOn(appliancesApi, "listAppliances").mockResolvedValue(mockAppliances)
    const createSpy = vi.spyOn(schedulesApi, "createSchedule").mockResolvedValue({
      id: 103,
      appliance_id: 1,
      action: "OFF",
      scheduled_time: "2026-09-08T22:00:00.000Z",
      created_by: 1,
      created_at: "2026-09-08T08:00:00.000Z",
      executed_at: null,
    })

    renderWithProviders(<SchedulePage />)

    await screen.findByText("Conference Room Lights")

    const openButton = screen.getByRole("button", { name: /New Schedule/i })
    fireEvent.click(openButton)

    expect(screen.getByText("Create Scheduled Action")).toBeDefined()

    fireEvent.change(screen.getByLabelText(/Appliance/i), {
      target: { value: "1" },
    })
    fireEvent.change(screen.getByLabelText(/Action/i), {
      target: { value: "OFF" },
    })
    fireEvent.change(screen.getByLabelText(/Scheduled Time/i), {
      target: { value: "2026-09-08T22:00" },
    })

    fireEvent.click(screen.getByRole("button", { name: /Save Schedule/i }))

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalled()
    })

    expect(createSpy.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        appliance_id: 1,
        action: "OFF",
        scheduled_time: expect.any(String),
      }),
    )

    await waitFor(() => {
      expect(screen.queryByText("Create Scheduled Action")).toBeNull()
    })
  })

  it("T-B3: Schedule delete removes item from list", async () => {
    vi.spyOn(schedulesApi, "listSchedules").mockResolvedValue(mockSchedules)
    vi.spyOn(appliancesApi, "listAppliances").mockResolvedValue(mockAppliances)
    const deleteSpy = vi.spyOn(schedulesApi, "deleteSchedule").mockResolvedValue(undefined)

    renderWithProviders(<SchedulePage />)

    await screen.findByText("Conference Room Lights")

    const deleteButton = screen.getByRole("button", {
      name: "Delete schedule for Conference Room Lights",
    })

    fireEvent.click(deleteButton)

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalled()
    })

    expect(deleteSpy.mock.calls[0][0]).toBe(101)
  })

  it("displays error message when schedule deletion fails", async () => {
    vi.spyOn(schedulesApi, "listSchedules").mockResolvedValue(mockSchedules)
    vi.spyOn(appliancesApi, "listAppliances").mockResolvedValue(mockAppliances)
    vi.spyOn(schedulesApi, "deleteSchedule").mockRejectedValue(new Error("Failed to delete schedule"))

    renderWithProviders(<SchedulePage />)

    await screen.findByText("Conference Room Lights")

    const deleteButton = screen.getByRole("button", {
      name: "Delete schedule for Conference Room Lights",
    })

    fireEvent.click(deleteButton)

    expect(await screen.findByText("Failed to delete schedule")).toBeDefined()
  })
})
