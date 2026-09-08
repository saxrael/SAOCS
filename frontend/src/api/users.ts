import { apiClient } from "@/lib/api-client"
import type { User, UserRegisterRequest } from "@/types/user"

export function listUsers(): Promise<User[]> {
  return apiClient.get<User[]>("/users/")
}

export function registerUser(body: UserRegisterRequest): Promise<User> {
  return apiClient.post<User>("/users/register", body)
}
