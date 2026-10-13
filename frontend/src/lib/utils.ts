import type { Appliance } from "@/types/appliance"
import type { ActivityLogEntry } from "@/types/activity-log"
import { TARIFF_RATE_PER_KWH } from "./constants"

export function parseUtcDate(isoString: string): Date {
  if (!isoString.endsWith("Z") && !/[+-]\d{2}:\d{2}$/.test(isoString)) {
    return new Date(isoString + "Z")
  }
  return new Date(isoString)
}

export function computeDailyEnergy(
  appliances: Appliance[],
  logs: ActivityLogEntry[],
): { totalKwh: number; totalCost: number } {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()

  let totalKwh = 0
  for (const appliance of appliances) {
    const allAppLogs = logs
      .filter((l) => l.appliance_id === appliance.id)
      .sort((a, b) => parseUtcDate(a.timestamp).getTime() - parseUtcDate(b.timestamp).getTime())

    const priorLogs = allAppLogs.filter((l) => parseUtcDate(l.timestamp).getTime() < startOfDay)
    const todayLogs = allAppLogs.filter((l) => parseUtcDate(l.timestamp).getTime() >= startOfDay)

    let onTime: number | null = null
    let totalDurationMs = 0

    if (priorLogs.length > 0) {
      const lastPrior = priorLogs[priorLogs.length - 1]
      if (lastPrior.event_type === "POWER_ON" || lastPrior.event_type === "ON") {
        onTime = startOfDay
      }
    } else if (appliance.state?.current_state === "ON" && todayLogs.length === 0) {
      if (appliance.state.last_changed_at) {
        const changedTime = parseUtcDate(appliance.state.last_changed_at).getTime()
        onTime = Math.max(startOfDay, changedTime)
      } else {
        onTime = startOfDay
      }
    }

    for (const log of todayLogs) {
      const logTime = parseUtcDate(log.timestamp).getTime()
      if (log.event_type === "POWER_ON" || log.event_type === "ON") {
        if (onTime === null) {
          onTime = logTime
        }
      } else if ((log.event_type === "POWER_OFF" || log.event_type === "OFF") && onTime !== null) {
        totalDurationMs += Math.max(0, logTime - onTime)
        onTime = null
      }
    }

    if (onTime !== null) {
      totalDurationMs += Math.max(0, now.getTime() - onTime)
    }

    const hours = totalDurationMs / (1000 * 60 * 60)
    totalKwh += (appliance.assumed_wattage_watts * hours) / 1000
  }

  const totalCost = totalKwh * TARIFF_RATE_PER_KWH
  return { totalKwh, totalCost }
}

export function formatDateTime(isoString: string): string {
  return parseUtcDate(isoString).toLocaleString()
}

export function formatDate(isoString: string): string {
  return parseUtcDate(isoString).toLocaleDateString()
}

export function formatKwh(kwh: number): string {
  if (kwh > 0 && kwh < 0.01) {
    return kwh.toFixed(4)
  }
  return kwh.toFixed(2)
}
