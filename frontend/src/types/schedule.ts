export interface ScheduleCreateRequest {
  appliance_id: number
  action: "ON" | "OFF"
  scheduled_time: string
}

export interface Schedule {
  id: number
  appliance_id: number
  action: string
  scheduled_time: string
  created_by: number | null
  created_at: string
  executed_at: string | null
}
