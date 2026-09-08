import { apiClient } from "@/lib/api-client"
import type {
  Appliance,
  ApplianceCommandRequest,
  ApplianceCommandResponse,
} from "@/types/appliance"

export function listAppliances(): Promise<Appliance[]> {
  return apiClient.get<Appliance[]>("/appliances/")
}

export function commandAppliance(
  applianceId: number,
  body: ApplianceCommandRequest,
): Promise<ApplianceCommandResponse> {
  return apiClient.post<ApplianceCommandResponse>(
    `/appliances/${applianceId}/command`,
    body,
  )
}
