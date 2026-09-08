export interface UserRegisterRequest {
  email: string
  is_admin: boolean
}

export interface User {
  id: number
  email: string
  is_admin: boolean
  created_at: string
  failed_login_attempts: number
  locked_at: string | null
}
