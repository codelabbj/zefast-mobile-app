import axios from "axios"
import { getAccessToken } from "./auth"

const getStorage = () => {
  if (typeof window !== "undefined") {
    const rememberMe = localStorage.getItem("remember_me")
    // Default to localStorage if never set (fresh install)
    if (rememberMe === null || rememberMe === "true") {
      return localStorage
    }
    return sessionStorage
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
            `${(process.env.NEXT_PUBLIC_BASE_URL || "https://api.zefast.net").replace(/\/$/, "")}/auth/refresh`,
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

    // Handle specific HTTP status codes with default French messages
    let errorMessage = ""

    if (error.response?.status >= 500) {
      // Server errors (500 and above)
      errorMessage = "Erreur du serveur. Veuillez réessayer plus tard."
    } else if (error.response?.status === 404) {
      // Not found errors
      errorMessage = "Ressource non trouvée. Veuillez vérifier l'URL ou contacter le support."
    } else if (!error.response) {
      // Network errors or no response (unrecognized errors)
      errorMessage = "Erreur de connexion. Vérifiez votre connexion internet et réessayez."
    } else {
      // Extract error message from backend response for other status codes
      // Check for 'details' first (plural), then 'detail' (singular), then other fields
    const backendMsg =
      error.response?.data?.details ||
        error.response?.data?.detail ||
      error.response?.data?.error ||
      error.response?.data?.message ||
        (typeof error.response?.data === "string" ? error.response.data : null)

      errorMessage = backendMsg || "Une erreur est survenue. Veuillez réessayer."
    }

    return Promise.reject({ message: errorMessage, originalError: error })
  },
)

export default api
