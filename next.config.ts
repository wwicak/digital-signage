import { NextConfig } from 'next';

// Attempt to import withCSS. If @types/zeit__next-css is not available,
// and the module doesn't provide its own types, this might require a
// more specific type definition or a // @ts-ignore in a real project
// if type checking fails here.
// For the purpose of this conversion, we'll assume a basic function signature.
// const withCSS = require('@zeit/next-css'); // Fallback if import doesn't work well without types

// Define a basic type for the withCSS function if specific types are unavailable
type WithCSS = (config: Partial<NextConfig>) => NextConfig;

// Attempting to import. In a real scenario, if this fails due to lack of types,
// one might use `const withCSS = require('@zeit/next-css') as WithCSS;`
// or add a custom type declaration file for '@zeit/next-css'.
import withCSSDefault from '@zeit/next-css';

const withCSS: WithCSS = withCSSDefault as any; // Cast if import is problematic or untyped

const nextConfig: NextConfig = withCSS({
  // cssLoaderOptions is specific to @zeit/next-css
  // It's not a standard NextConfig property directly.
  // The `withCSS` HOC handles this and returns a valid NextConfig.
  cssLoaderOptions: {
    url: false,
  },
  // Other Next.js specific configurations would go here, for example:
  // pageExtensions: ['jsx', 'js', 'tsx', 'ts'],
  // env: {
  //   MY_ENV_VAR: process.env.MY_ENV_VAR,
  // },
});

export default nextConfig;
