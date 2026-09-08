import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
import { apiClient } from "@/lib/api-client"
import { getMe, login as apiLogin, setupPassword as apiSetupPassword } from "@/api/auth"
import type { AuthUser, LoginRequest, SetupPasswordRequest } from "@/types/auth"

interface AuthContextType {
  user: AuthUser | null
  isAdmin: boolean
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginRequest) => Promise<void>
  setupPassword: (data: SetupPasswordRequest, setupToken: string) => Promise<void>
  logout: () => void
  handleAuthCallback: (accessToken: string, refreshToken: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function initAuth() {
      const token = await apiClient.getAccessToken()
      if (token) {
        try {
          const profile = await getMe()
          setUser(profile)
        } catch {
          apiClient.clearTokens()
          setUser(null)
        }
      }
      setIsLoading(false)
    }
    initAuth()
  }, [])

  const login = useCallback(async (credentials: LoginRequest) => {
    const tokens = await apiLogin(credentials)
    apiClient.setTokens(tokens.access_token, tokens.refresh_token)
    const profile = await getMe()
    setUser(profile)
  }, [])

  const setupPassword = useCallback(async (data: SetupPasswordRequest, setupToken: string) => {
    const tokens = await apiSetupPassword(data, setupToken)
    apiClient.setTokens(tokens.access_token, tokens.refresh_token)
    const profile = await getMe()
    setUser(profile)
  }, [])

  const handleAuthCallback = useCallback(async (accessToken: string, refreshToken: string) => {
    apiClient.setTokens(accessToken, refreshToken)
    const profile = await getMe()
    setUser(profile)
  }, [])

  const logout = useCallback(() => {
    apiClient.clearTokens()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin: user?.is_admin ?? false,
        isAuthenticated: !!user,
        isLoading,
        login,
        setupPassword,
        logout,
        handleAuthCallback,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider")
  }
  return context
}
