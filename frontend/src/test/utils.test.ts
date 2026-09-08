import { describe, expect, it } from "vitest"
import { computeDailyEnergy, formatDate, formatDateTime } from "@/lib/utils"
import { TARIFF_RATE_PER_KWH } from "@/lib/constants"
import type { Appliance } from "@/types/appliance"
import type { ActivityLogEntry } from "@/types/activity-log"

describe("utils", () => {
  it("formats date and datetime strings", () => {
    const iso = "2026-09-08T12:00:00.000Z"
    expect(formatDateTime(iso)).toBeTypeOf("string")
    expect(formatDate(iso)).toBeTypeOf("string")
  })

  it("computes daily energy consumption and cost correctly", () => {
    const appliances: Appliance[] = [
      {
        id: 1,
        name: "Test Appliance",
        device_id: "esp32_c3_01",
        relay_channel: 1,
        assumed_wattage_watts: 1000,
        state: {
          current_state: "OFF",
          last_changed_source: "manual",
          last_changed_at: new Date().toISOString(),
        },
      },
    ]

    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 3600000).toISOString()
    const thirtyMinAgo = new Date(now.getTime() - 1800000).toISOString()

    const logs: ActivityLogEntry[] = [
      {
        id: 1,
        appliance_id: 1,
        appliance_name: "Test Appliance",
        event_type: "POWER_ON",
        source: "manual",
        actor_user_id: 1,
        actor_email: "test@example.com",
        timestamp: oneHourAgo,
      },
      {
        id: 2,
        appliance_id: 1,
        appliance_name: "Test Appliance",
        event_type: "POWER_OFF",
        source: "manual",
        actor_user_id: 1,
        actor_email: "test@example.com",
        timestamp: thirtyMinAgo,
      },
    ]

    const { totalKwh, totalCost } = computeDailyEnergy(appliances, logs)
    expect(totalKwh).toBeCloseTo(0.5, 1)
    expect(totalCost).toBeCloseTo(0.5 * TARIFF_RATE_PER_KWH, 1)
  })

  it("handles empty appliances and empty logs", () => {
    const result = computeDailyEnergy([], [])
    expect(result.totalKwh).toBe(0)
    expect(result.totalCost).toBe(0)
  })
})
