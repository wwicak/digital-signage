import React from 'react'
import StyledComponentsRegistry from './lib/registry'
import { Providers } from './providers'
import { Edit, X, Trash2, Plus, Minus, Eye, User, Settings, Key, Tv, Grid3X3, Grid2X2, Images, Image, Play, Pause, Stop, Clock, Calendar, ExternalLink, Download, Upload, Save, LogOut, ChevronDown, ChevronUp, Layout, Cast, Smartphone, Tablet, Monitor } from 'lucide-react'

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
    <html lang='en'>
      <head>
        <link
          href='https://fonts.googleapis.com/css?family=Open+Sans:300,400,600,700,800'
          rel='stylesheet'
        />
        <style>{'body { margin: 0 } /* custom! */'}</style>
      </head>
      <body>
        <Providers>
          <StyledComponentsRegistry>
            {children}
          </StyledComponentsRegistry>
        </Providers>
      </body>
    </html>
  )
}