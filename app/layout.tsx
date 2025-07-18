import React from 'react'
import { Providers } from './providers'

// Import global styles
import '../styles/globals.css'
// import { AuthRedirect } from '@/components/Auth/AuthRedirect'

export const metadata = {
  title: 'Digital Signage',
  description: 'A user interface for dynamic digital signage',
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en' suppressHydrationWarning>
      <head>
        <link
          href='https://fonts.googleapis.com/css?family=Open+Sans:300,400,600,700,800'
          rel='stylesheet'
        />
        <style>{'body { margin: 0 } /* custom! */'}</style>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-touch-fullscreen" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body suppressHydrationWarning>
        <Providers>
          {/* <AuthRedirect /> */}
          {children}
        </Providers>
      </body>
    </html>
  )
}