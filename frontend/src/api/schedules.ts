import { apiClient } from "@/lib/api-client"
import type { Schedule, ScheduleCreateRequest } from "@/types/schedule"

export function listSchedules(): Promise<Schedule[]> {
  return apiClient.get<Schedule[]>("/schedules/")
}

export function createSchedule(
  body: ScheduleCreateRequest,
): Promise<Schedule> {
  return apiClient.post<Schedule>("/schedules/", body)
}

export function deleteSchedule(scheduleId: number): Promise<void> {
  return apiClient.delete<void>(`/schedules/${scheduleId}`)
}
