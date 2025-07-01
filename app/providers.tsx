'use client'

import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@/components/ui/theme-provider'
import { DisplayProvider } from '../contexts/DisplayContext'

// Create a client with memory leak prevention and better error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime)
      retry: (failureCount, error: unknown) => {
        // Don't retry on network errors or 4xx errors
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStatus = (error as { status?: number })?.status;
        
        if (
          errorMessage.includes('Failed to fetch') ||
          errorMessage.includes('ERR_NETWORK') ||
          errorMessage.includes('NetworkError') ||
          (errorStatus && errorStatus >= 400 && errorStatus < 500)
        ) {
          return false;
        }
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false, // Disable for digital signage use case
      refetchOnReconnect: true,
      refetchOnMount: true,
    },
    mutations: {
      retry: (failureCount, error: unknown) => {
        // Don't retry mutations on network errors
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        if (
          errorMessage.includes('Failed to fetch') ||
          errorMessage.includes('ERR_NETWORK') ||
          errorMessage.includes('NetworkError')
        ) {
          return false;
        }
        return failureCount < 1;
      },
    },
  },
})

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute='class'
        defaultTheme='light'
        enableSystem
        disableTransitionOnChange
        storageKey='digital-signage-theme'
      >
        <DisplayProvider>
          {children}
        </DisplayProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}