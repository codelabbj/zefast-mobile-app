import axios from "axios"
import { getAccessToken } from "./auth"

const getStorage = () => {
  if (typeof window !== "undefined") {
    const rememberMe = localStorage.getItem("remember_me") === "true"
    return rememberMe ? localStorage : sessionStorage
  }
  return localStorage
}

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL || "https://api.zefast.net",
})

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = getAccessToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// Response interceptor for token refresh and error handling
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config

    // Handle 401 errors with token refresh
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true

      if (typeof window !== "undefined") {
        try {
          const storage = getStorage()
          const refresh = storage.getItem("refresh_token")
          if (!refresh) {
            throw new Error("No refresh token")
          }

          const res = await axios.post(
            `${process.env.NEXT_PUBLIC_BASE_URL || "https://api.zefast.net"}/auth/refresh`,
            { refresh },
          )

          const newToken = res.data.access
          storage.setItem("access_token", newToken)
          original.headers.Authorization = `Bearer ${newToken}`

          return api(original)
        } catch (refreshError) {
          // Clear tokens and redirect to login
          localStorage.clear()
          sessionStorage.clear()
          window.location.href = "/login"
          return Promise.reject(refreshError)
        }
      }
    }

    // Extract error message from backend response
    // Check for 'details' first (plural), then 'detail' (singular), then other fields
    const backendMsg =
      error.response?.data?.details ||
      error.response?.data?.detail ||
      error.response?.data?.error ||
      error.response?.data?.message ||
      (typeof error.response?.data === "string" ? error.response.data : "Une erreur est survenue. Veuillez réessayer.")

    return Promise.reject({ message: backendMsg, originalError: error })
  },
)

export default api
