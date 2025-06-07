/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features for Next.js 14
  experimental: {
    // Enable Turbopack for faster builds (disabled for now due to compatibility issues)
    // turbo: true,
  },

  // Transpile packages that might need it
  transpilePackages: [
    "react-grid-layout",
    "react-beautiful-dnd",
    "react-easy-state",
  ],

  // Configure static file serving
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: "/uploads/:path*",
      },
    ];
  },

  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // Page extensions
  pageExtensions: ["tsx", "ts", "jsx", "js"],

  // Image optimization
  images: {
    domains: ["localhost"],
    dangerouslyAllowSVG: true,
    unoptimized: true, // For development, can be removed in production
  },

  // Enable styled-jsx
  compiler: {
    styledComponents: true,
  },

  // Configure to skip static generation for SSE routes
  experimental: {
    serverComponentsExternalPackages: ["mongoose"],
  },

  // Skip static optimization for specific routes
  async headers() {
    return [
      {
        source: "/api/v1/displays/events",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
