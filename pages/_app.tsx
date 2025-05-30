import { AppProps } from 'next/app';
import React from 'react';

// Import global styles
import '../styles/globals.css';
import '../styles/GridLayoutStyles.css';
import 'react-resizable/css/styles.css';
import '@fortawesome/fontawesome-svg-core/styles.css'; // Prevent Font Awesome from adding its own CSS automatically

// If react-easy-state's view HOC were used here, or a global Provider,
// it would be initialized or wrapped here.
// For example, if `view` was required for all pages:
// import { view } from 'react-easy-state';

// Modern functional App component using the new pattern for Next.js 12+
export default function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
