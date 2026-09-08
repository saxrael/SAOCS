export interface LoginRequest {
  email: string
  password: string
}

export interface SetupPasswordRequest {
  password: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface SetupTokenResponse {
  setup_token: string
  needs_password_setup: boolean
}

export interface RefreshRequest {
  refresh_token: string
}

export interface AuthUser {
  id: number
  email: string
  is_admin: boolean
  created_at: string
  failed_login_attempts: number
  locked_at: string | null
}
