import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import StyledComponentsRegistry from './lib/registry';
import { GlobalDisplayListProvider } from '../contexts/GlobalDisplayListContext';

// Import global styles
import '../styles/globals.css';
import '../styles/GridLayoutStyles.css';
import 'react-resizable/css/styles.css';
import '@fortawesome/fontawesome-svg-core/styles.css';

export const metadata = {
  title: 'Digital Signage',
  description: 'A user interface for dynamic digital signage',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

// Create a single QueryClient instance
const queryClient = new QueryClient();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css?family=Open+Sans:300,400,600,700,800"
          rel="stylesheet"
        />
        <style>{'body { margin: 0 } /* custom! */'}</style>
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <GlobalDisplayListProvider>
            <StyledComponentsRegistry>
              {children}
            </StyledComponentsRegistry>
          </GlobalDisplayListProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}