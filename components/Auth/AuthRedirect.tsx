'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'

// This component handles automatic redirect to login when authentication fails
export function AuthRedirect() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Skip for login and auth pages
    if (pathname?.startsWith('/login') || pathname?.startsWith('/api/auth')) {
      return
    }

    // Check if we're already authenticated
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me')
        if (response.status === 401) {
          // Redirect to login with return URL
          const redirectUrl = encodeURIComponent(window.location.pathname + window.location.search)
          router.push(`/login?redirect=${redirectUrl}`)
        }
      } catch (error) {
        // Network error or other issues - also redirect to login
        const redirectUrl = encodeURIComponent(window.location.pathname + window.location.search)
        router.push(`/login?redirect=${redirectUrl}`)
      }
    }

    // Check authentication on mount
    checkAuth()

    // Set up a global response interceptor for API calls
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      const response = await originalFetch(...args)
      
      // Check for 401 authentication errors
      if (response.status === 401) {
        try {
          const errorData = await response.clone().json()
          if (errorData.error === "UNAUTHENTICATED" || errorData.message === "Authentication required") {
            const redirectUrl = encodeURIComponent(window.location.pathname + window.location.search)
            router.push(`/login?redirect=${redirectUrl}`)
          }
        } catch (e) {
          // If we can't parse JSON, still redirect on 401
          const redirectUrl = encodeURIComponent(window.location.pathname + window.location.search)
          router.push(`/login?redirect=${redirectUrl}`)
        }
      }
      
      return response
    }

    // Cleanup function
    return () => {
      window.fetch = originalFetch
    }
  }, [router, pathname])

  return null
}