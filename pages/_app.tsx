import { AppProps } from 'next/app'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { DisplayProvider } from '../contexts/DisplayContext'
import { Toaster } from 'sonner'

// Import global styles
import '../styles/globals.css'
import '../styles/GridLayoutStyles.css'
import 'react-resizable/css/styles.css'

// Create a client with better error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime)
      retry: (failureCount, error: any) => {
        // Don't retry on network errors or 4xx errors
        if (
          error.message.includes('Failed to fetch') ||
          error.message.includes('ERR_NETWORK') ||
          error.message.includes('NetworkError') ||
          (error.status >= 400 && error.status < 500)
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
      retry: (failureCount, error: any) => {
        // Don't retry mutations on network errors
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

// Modern functional App component using the new pattern for Next.js 12+
export default function MyApp({ Component, pageProps }: AppProps) {
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
          <Component {...pageProps} />
          <Toaster richColors position='top-right' />
        </DisplayProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
