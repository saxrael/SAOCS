import { apiClient } from "@/lib/api-client"
import type { ActivityLogEntry } from "@/types/activity-log"

export interface ActivityLogParams {
  limit?: number
  offset?: number
  appliance_id?: number
}

export function listActivityLogs(
  params: ActivityLogParams = {},
): Promise<ActivityLogEntry[]> {
  const searchParams = new URLSearchParams()
  if (params.limit) searchParams.set("limit", String(params.limit))
  if (params.offset) searchParams.set("offset", String(params.offset))
  if (params.appliance_id)
    searchParams.set("appliance_id", String(params.appliance_id))

  const query = searchParams.toString()
  return apiClient.get<ActivityLogEntry[]>(
    `/activity-log/${query ? `?${query}` : ""}`,
  )
}

export async function downloadExport(): Promise<void> {
  const token = await apiClient.getAccessToken()
  const response = await fetch("/api/activity-log/export", {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error("Export failed")
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `saocs_activity_log_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
