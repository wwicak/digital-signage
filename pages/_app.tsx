// pages/_app.tsx

import { AppProps } from 'next/app'
import React, { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { DisplayProvider } from '../contexts/DisplayContext'
import { Toaster } from 'sonner'
import { useRouter } from 'next/router'

import '../styles/globals.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: (failureCount, error: Error & { status?: number }) => {
        if (
          error.message.includes('Failed to fetch') ||
          error.message.includes('ERR_NETWORK') ||
          error.message.includes('NetworkError') ||
          (error.status !== undefined && error.status >= 400 && error.status < 500)
        ) {
          return false;
        }
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: true,
    },
    mutations: {
      retry: (failureCount, error: Error & { status?: number }) => {
        if (
          error.message.includes('Failed to fetch') ||
          error.message.includes('ERR_NETWORK') ||
          error.message.includes('NetworkError')
        ) {
          return false;
        }
        return failureCount < 1;
      },
    },
  },
})

export default function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      // Default: auth = true unless explicitly false
      const requiresAuth = (Component as any).auth !== false
      console.log('Requires auth:', requiresAuth)
      if (typeof window !== 'undefined' && requiresAuth) {
        try {
          const res = await fetch('/api/auth/me')
          if (res.status === 401) {
            const redirectUrl = encodeURIComponent(window.location.pathname + window.location.search)
            router.push(`/login?redirect=${redirectUrl}`)
          }
        } catch {
          const redirectUrl = encodeURIComponent(window.location.pathname + window.location.search)
          router.push(`/login?redirect=${redirectUrl}`)
        }
      }
    }

    checkAuth()
  }, [router, Component])

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem
        disableTransitionOnChange
        storageKey="digital-signage-theme"
      >
        <DisplayProvider>
          <Component {...pageProps} />
          <Toaster richColors position="top-right" />
        </DisplayProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
