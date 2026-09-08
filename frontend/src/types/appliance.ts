export interface ApplianceState {
  current_state: "ON" | "OFF"
  last_changed_source: string
  last_changed_at: string
}

export interface Appliance {
  id: number
  name: string
  device_id: string
  relay_channel: number
  assumed_wattage_watts: number
  state: ApplianceState | null
}

export interface ApplianceCommandRequest {
  state: "ON" | "OFF"
}

export interface ApplianceCommandResponse {
  status: string
  appliance_id: number
  target_state: string
}
