import { AppProps } from 'next/app'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { DisplayProvider } from '../contexts/DisplayContext'

// Import FontAwesome configuration
import '../lib/fontawesome'

// Import global styles
import '../styles/globals.css'
import '../styles/GridLayoutStyles.css'
import 'react-resizable/css/styles.css'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false, // Disable for digital signage use case
    },
    mutations: {
      retry: 1,
    },
  },
})

// Modern functional App component using the new pattern for Next.js 12+
export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <DisplayProvider>
        <Component {...pageProps} />
        <ReactQueryDevtools initialIsOpen={false} />
      </DisplayProvider>
    </QueryClientProvider>
  )
}
