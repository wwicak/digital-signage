import React from 'react'
import { Providers } from './providers'

// Import global styles
import '../styles/globals.css'
import '../styles/GridLayoutStyles.css'
import 'react-resizable/css/styles.css'

export const metadata = {
  title: 'Digital Signage',
  description: 'A user interface for dynamic digital signage',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
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
      </head>
      <body suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}