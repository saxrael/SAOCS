import type { Appliance } from "@/types/appliance"
import type { ActivityLogEntry } from "@/types/activity-log"
import { TARIFF_RATE_PER_KWH } from "./constants"

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
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    const priorLogs = allAppLogs.filter((l) => new Date(l.timestamp).getTime() < startOfDay)
    const todayLogs = allAppLogs.filter((l) => new Date(l.timestamp).getTime() >= startOfDay)

    let onTime: number | null = null
    let totalDurationMs = 0

    if (priorLogs.length > 0) {
      const lastPrior = priorLogs[priorLogs.length - 1]
      if (lastPrior.event_type === "POWER_ON" || lastPrior.event_type === "ON") {
        onTime = startOfDay
      }
    } else if (appliance.state?.current_state === "ON" && todayLogs.length === 0) {
      onTime = startOfDay
    }

    for (const log of todayLogs) {
      const logTime = new Date(log.timestamp).getTime()
      if (log.event_type === "POWER_ON" || log.event_type === "ON") {
        if (onTime === null) {
          onTime = logTime
        }
      } else if ((log.event_type === "POWER_OFF" || log.event_type === "OFF") && onTime !== null) {
        totalDurationMs += logTime - onTime
        onTime = null
      }
    }

    if (onTime !== null) {
      totalDurationMs += now.getTime() - onTime
    }

    const hours = totalDurationMs / (1000 * 60 * 60)
    totalKwh += (appliance.assumed_wattage_watts * hours) / 1000
  }

  const totalCost = totalKwh * TARIFF_RATE_PER_KWH
  return { totalKwh, totalCost }
}

export function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString()
}

export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString()
}
