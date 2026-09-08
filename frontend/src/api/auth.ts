import { apiClient } from "@/lib/api-client"
import type {
  LoginRequest,
  TokenResponse,
  SetupPasswordRequest,
  AuthUser,
} from "@/types/auth"

export function login(body: LoginRequest): Promise<TokenResponse> {
  return apiClient.post<TokenResponse>("/auth/login", body)
}

export function setupPassword(
  body: SetupPasswordRequest,
  setupToken: string,
): Promise<TokenResponse> {
  return fetch("/api/auth/setup-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${setupToken}`,
    },
    body: JSON.stringify(body),
  }).then((r) => {
    if (!r.ok) throw new Error("Password setup failed")
    return r.json()
  })
}

export function getMe(): Promise<AuthUser> {
  return apiClient.get<AuthUser>("/auth/me")
}

export function refreshToken(
  refreshTokenValue: string,
): Promise<TokenResponse> {
  return apiClient.post<TokenResponse>("/auth/refresh", {
    refresh_token: refreshTokenValue,
  })
}

export function getGoogleLoginUrl(): string {
  return "/api/auth/google/login"
}
