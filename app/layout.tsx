import React from 'react';
import StyledComponentsRegistry from './lib/registry';

// Import global styles
import '../styles/GridLayoutStyles.css';
import 'react-resizable/css/styles.css';
import '@fortawesome/fontawesome-svg-core/styles.css';

export const metadata = {
  title: 'Digital Signage',
  description: 'A user interface for dynamic digital signage',
  viewport: 'width=device-width, initial-scale=1',
};

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
        <StyledComponentsRegistry>
          {children}
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}