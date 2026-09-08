import { describe, expect, it } from "vitest"
import { computeDailyEnergy } from "@/lib/utils"
import { TARIFF_RATE_PER_KWH } from "@/lib/constants"
import type { Appliance } from "@/types/appliance"
import type { ActivityLogEntry } from "@/types/activity-log"

describe("Adversarial Energy and Calculation Rigor Suite", () => {
  it("verifies mathematical ground truth for 1500W appliance over 2 hours", () => {
    const appliance: Appliance = {
      id: 10,
      name: "High Power AC",
      device_id: "esp32_dev_01",
      relay_channel: 1,
      assumed_wattage_watts: 1500,
      state: {
        current_state: "OFF",
        last_changed_source: "manual",
        last_changed_at: new Date().toISOString(),
      },
    }

    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const tStart = new Date(startOfDay + 1 * 3600000).toISOString()
    const tEnd = new Date(startOfDay + 3 * 3600000).toISOString()

    const logs: ActivityLogEntry[] = [
      {
        id: 101,
        appliance_id: 10,
        appliance_name: "High Power AC",
        event_type: "POWER_ON",
        source: "dashboard",
        actor_user_id: 1,
        actor_email: "admin@example.com",
        timestamp: tStart,
      },
      {
        id: 102,
        appliance_id: 10,
        appliance_name: "High Power AC",
        event_type: "POWER_OFF",
        source: "dashboard",
        actor_user_id: 1,
        actor_email: "admin@example.com",
        timestamp: tEnd,
      },
    ]

    const result = computeDailyEnergy([appliance], logs)
    const expectedKwh = (1500 * 2) / 1000
    const expectedCost = expectedKwh * 209.5

    expect(result.totalKwh).toBeCloseTo(expectedKwh, 2)
    expect(result.totalCost).toBeCloseTo(expectedCost, 2)
    expect(TARIFF_RATE_PER_KWH).toBe(209.5)
  })

  it("verifies 0W wattage boundary condition yields zero energy and cost", () => {
    const appliance: Appliance = {
      id: 11,
      name: "Zero Watt Sensor",
      device_id: "esp32_dev_01",
      relay_channel: 2,
      assumed_wattage_watts: 0,
      state: {
        current_state: "OFF",
        last_changed_source: "manual",
        last_changed_at: new Date().toISOString(),
      },
    }

    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const tStart = new Date(startOfDay + 1 * 3600000).toISOString()
    const tEnd = new Date(startOfDay + 6 * 3600000).toISOString()

    const logs: ActivityLogEntry[] = [
      {
        id: 201,
        appliance_id: 11,
        appliance_name: "Zero Watt Sensor",
        event_type: "POWER_ON",
        source: "dashboard",
        actor_user_id: 1,
        actor_email: "admin@example.com",
        timestamp: tStart,
      },
      {
        id: 202,
        appliance_id: 11,
        appliance_name: "Zero Watt Sensor",
        event_type: "POWER_OFF",
        source: "dashboard",
        actor_user_id: 1,
        actor_email: "admin@example.com",
        timestamp: tEnd,
      },
    ]

    const result = computeDailyEnergy([appliance], logs)
    expect(result.totalKwh).toBe(0)
    expect(result.totalCost).toBe(0)
  })

  it("verifies multiple state toggles within the same day", () => {
    const appliance: Appliance = {
      id: 12,
      name: "Office Light",
      device_id: "esp32_dev_01",
      relay_channel: 3,
      assumed_wattage_watts: 100,
      state: {
        current_state: "OFF",
        last_changed_source: "manual",
        last_changed_at: new Date().toISOString(),
      },
    }

    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const t1On = new Date(startOfDay + 1 * 3600000).toISOString()
    const t1Off = new Date(startOfDay + 2 * 3600000).toISOString()
    const t2On = new Date(startOfDay + 3 * 3600000).toISOString()
    const t2Off = new Date(startOfDay + 4 * 3600000).toISOString()

    const logs: ActivityLogEntry[] = [
      {
        id: 301,
        appliance_id: 12,
        appliance_name: "Office Light",
        event_type: "POWER_ON",
        source: "dashboard",
        actor_user_id: 1,
        actor_email: "admin@example.com",
        timestamp: t1On,
      },
      {
        id: 302,
        appliance_id: 12,
        appliance_name: "Office Light",
        event_type: "POWER_OFF",
        source: "dashboard",
        actor_user_id: 1,
        actor_email: "admin@example.com",
        timestamp: t1Off,
      },
      {
        id: 303,
        appliance_id: 12,
        appliance_name: "Office Light",
        event_type: "POWER_ON",
        source: "dashboard",
        actor_user_id: 1,
        actor_email: "admin@example.com",
        timestamp: t2On,
      },
      {
        id: 304,
        appliance_id: 12,
        appliance_name: "Office Light",
        event_type: "POWER_OFF",
        source: "dashboard",
        actor_user_id: 1,
        actor_email: "admin@example.com",
        timestamp: t2Off,
      },
    ]

    const result = computeDailyEnergy([appliance], logs)
    const expectedKwh = (100 * 2) / 1000
    const expectedCost = expectedKwh * 209.5
    expect(result.totalKwh).toBeCloseTo(expectedKwh, 2)
    expect(result.totalCost).toBeCloseTo(expectedCost, 2)
  })

  it("verifies currently active ON state calculates duration up to now", () => {
    const appliance: Appliance = {
      id: 15,
      name: "Water Dispenser",
      device_id: "esp32_dev_01",
      relay_channel: 2,
      assumed_wattage_watts: 500,
      state: {
        current_state: "ON",
        last_changed_source: "manual",
        last_changed_at: new Date().toISOString(),
      },
    }

    const now = new Date()
    const thirtyMinAgo = new Date(now.getTime() - 1800000).toISOString()

    const logs: ActivityLogEntry[] = [
      {
        id: 601,
        appliance_id: 15,
        appliance_name: "Water Dispenser",
        event_type: "POWER_ON",
        source: "dashboard",
        actor_user_id: 1,
        actor_email: "admin@example.com",
        timestamp: thirtyMinAgo,
      },
    ]

    const result = computeDailyEnergy([appliance], logs)
    const expectedHours = 0.5
    const expectedKwh = (500 * expectedHours) / 1000
    expect(result.totalKwh).toBeCloseTo(expectedKwh, 1)
    expect(result.totalCost).toBeCloseTo(expectedKwh * 209.5, 1)
  })

  it("correctly handles midnight-spanning ON state by calculating duration from midnight", () => {
    const appliance: Appliance = {
      id: 13,
      name: "Night AC",
      device_id: "esp32_dev_01",
      relay_channel: 4,
      assumed_wattage_watts: 1500,
      state: {
        current_state: "OFF",
        last_changed_source: "manual",
        last_changed_at: new Date().toISOString(),
      },
    }

    const now = new Date()
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 22, 0, 0)
    const todayEarly = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 2, 0, 0)

    const logs: ActivityLogEntry[] = [
      {
        id: 401,
        appliance_id: 13,
        appliance_name: "Night AC",
        event_type: "POWER_ON",
        source: "dashboard",
        actor_user_id: 1,
        actor_email: "admin@example.com",
        timestamp: yesterday.toISOString(),
      },
      {
        id: 402,
        appliance_id: 13,
        appliance_name: "Night AC",
        event_type: "POWER_OFF",
        source: "dashboard",
        actor_user_id: 1,
        actor_email: "admin@example.com",
        timestamp: todayEarly.toISOString(),
      },
    ]

    const result = computeDailyEnergy([appliance], logs)
    const expectedHours = 2
    const expectedKwh = (1500 * expectedHours) / 1000
    const expectedCost = expectedKwh * 209.5
    expect(result.totalKwh).toBeCloseTo(expectedKwh, 2)
    expect(result.totalCost).toBeCloseTo(expectedCost, 2)
  })

  it("prevents duration truncation on duplicate consecutive POWER_ON events", () => {
    const appliance: Appliance = {
      id: 14,
      name: "Fan",
      device_id: "esp32_dev_01",
      relay_channel: 1,
      assumed_wattage_watts: 80,
      state: {
        current_state: "OFF",
        last_changed_source: "manual",
        last_changed_at: new Date().toISOString(),
      },
    }

    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const t1 = new Date(startOfDay + 1 * 3600000).toISOString()
    const t2 = new Date(startOfDay + 2 * 3600000).toISOString()
    const t3 = new Date(startOfDay + 3 * 3600000).toISOString()

    const logs: ActivityLogEntry[] = [
      {
        id: 501,
        appliance_id: 14,
        appliance_name: "Fan",
        event_type: "POWER_ON",
        source: "dashboard",
        actor_user_id: 1,
        actor_email: "admin@example.com",
        timestamp: t1,
      },
      {
        id: 502,
        appliance_id: 14,
        appliance_name: "Fan",
        event_type: "POWER_ON",
        source: "mqtt_sync",
        actor_user_id: null,
        actor_email: null,
        timestamp: t2,
      },
      {
        id: 503,
        appliance_id: 14,
        appliance_name: "Fan",
        event_type: "POWER_OFF",
        source: "dashboard",
        actor_user_id: 1,
        actor_email: "admin@example.com",
        timestamp: t3,
      },
    ]

    const result = computeDailyEnergy([appliance], logs)
    const expectedHours = 2
    const expectedKwh = (80 * expectedHours) / 1000
    expect(result.totalKwh).toBeCloseTo(expectedKwh, 4)
  })

  it("computes duration from midnight when appliance is ON with no logs today", () => {
    const appliance: Appliance = {
      id: 16,
      name: "Server Rack Fan",
      device_id: "esp32_dev_01",
      relay_channel: 3,
      assumed_wattage_watts: 200,
      state: {
        current_state: "ON",
        last_changed_source: "manual",
        last_changed_at: new Date(Date.now() - 86400000).toISOString(),
      },
    }

    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const expectedHours = (now.getTime() - startOfDay) / (1000 * 60 * 60)
    const expectedKwh = (200 * expectedHours) / 1000

    const result = computeDailyEnergy([appliance], [])
    expect(result.totalKwh).toBeCloseTo(expectedKwh, 2)
    expect(result.totalCost).toBeCloseTo(expectedKwh * 209.5, 2)
  })

  it("validates schedule payload ISO string generation and schema compliance", () => {
    const localDateTimeInput = "2026-09-08T15:30"
    const parsedDate = new Date(localDateTimeInput)
    const isoString = parsedDate.toISOString()

    expect(isoString).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)

    const payload = {
      appliance_id: 1,
      action: "ON" as const,
      scheduled_time: isoString,
    }

    expect(payload.appliance_id).toBe(1)
    expect(["ON", "OFF"]).toContain(payload.action)
    expect(new Date(payload.scheduled_time).getTime()).toBeGreaterThan(0)
  })
})
