export interface ActivityLogEntry {
  id: number
  appliance_id: number
  appliance_name: string | null
  event_type: string
  source: string
  actor_user_id: number | null
  actor_email: string | null
  timestamp: string
}
