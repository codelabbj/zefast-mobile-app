export interface User {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  bonus_available: number
  referral_code: string
}

export interface AuthResponse {
  refresh: string
  access: string
  exp: string
  data: User
}

export const saveAuthData = (authData: AuthResponse, rememberMe: boolean = true) => {
  if (typeof window !== "undefined") {
    const storage = rememberMe ? localStorage : sessionStorage
    storage.setItem("access_token", authData.access)
    storage.setItem("refresh_token", authData.refresh)
    storage.setItem("user", JSON.stringify(authData.data))
    storage.setItem("remember_me", rememberMe.toString())
    // Always persist remember_me flag in localStorage regardless of mode
    localStorage.setItem("remember_me", rememberMe.toString())
  }
}

const getStorage = () => {
  if (typeof window !== "undefined") {
    // Default to localStorage (persistent) — only use sessionStorage if user
    // explicitly opted out of "remember me" on a non-mobile platform.
    const rememberMe = localStorage.getItem("remember_me")
    // If never set (fresh install) OR set to true → use localStorage
    if (rememberMe === null || rememberMe === "true") {
      return localStorage
    }
    return sessionStorage
  }
  return localStorage
}

export const getUser = (): User | null => {
  if (typeof window !== "undefined") {
    // Migrate tokens from sessionStorage to localStorage if needed (fixes logout-on-restart)
    const rememberMe = localStorage.getItem("remember_me")
    if (rememberMe === null || rememberMe === "true") {
      const sessionToken = sessionStorage.getItem("access_token")
      if (sessionToken) {
        localStorage.setItem("access_token", sessionToken)
        localStorage.setItem("refresh_token", sessionStorage.getItem("refresh_token") || "")
        localStorage.setItem("user", sessionStorage.getItem("user") || "")
        localStorage.setItem("remember_me", "true")
        sessionStorage.clear()
      }
    }

    const storage = getStorage()
    const userStr = storage.getItem("user")
    if (userStr) {
      try {
        return JSON.parse(userStr)
      } catch {
        return null
      }
    }
  }
  return null
}

export const getAccessToken = (): string | null => {
  if (typeof window !== "undefined") {
    const storage = getStorage()
    return storage.getItem("access_token")
  }
  return null
}

export const isAuthenticated = (): boolean => {
  return !!getAccessToken()
}

export const logout = () => {
  if (typeof window !== "undefined") {
    localStorage.clear()
    sessionStorage.clear()
    window.location.href = "/login"
  }
}
