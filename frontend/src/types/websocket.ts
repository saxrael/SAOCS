export interface StateChangeEvent {
  event: "state_change"
  appliance_id: number
  device_id: string
  channel: number
  state: "ON" | "OFF"
  source: string
  timestamp: string
}

export interface DeviceStatusEvent {
  event: "device_status"
  device_id: string
  status: "online" | "offline"
  timestamp: string
}

export type WebSocketMessage = StateChangeEvent | DeviceStatusEvent
