"use client"

import { useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { mobileBackButtonHandler } from "@/lib/mobile-back-button"
import { isAuthenticated } from "@/lib/auth"

export function MobileBackButtonHandler() {
  const router = useRouter()
  const pathname = usePathname()
  const pathnameRef = useRef(pathname)

  // Keep pathname ref up to date
  useEffect(() => {
    pathnameRef.current = pathname
  }, [pathname])

  useEffect(() => {
    const handleBackButton = () => {
      const currentPath = pathnameRef.current
      const authenticated = isAuthenticated()
      
      // Always navigate to dashboard if authenticated, prevent app exit
      if (authenticated) {
        if (currentPath !== "/dashboard") {
          router.push("/dashboard")
        }
        // If already on dashboard, prevent exit by doing nothing
        // This keeps the user on the dashboard instead of exiting the app
        return
      } else {
        // Not authenticated - navigate to login if not already there
        if (currentPath !== "/login" && currentPath !== "/") {
          router.push("/login")
        }
        // If on login or root, allow natural behavior (but prevent exit)
        return
      }
    }

    // Initialize mobile back button handler
    mobileBackButtonHandler.initialize(handleBackButton)

    // Update callback when pathname changes
    mobileBackButtonHandler.setCallback(handleBackButton)

    // Cleanup on unmount
    return () => {
      mobileBackButtonHandler.cleanup()
    }
  }, [router])

  return null
}

