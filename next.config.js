/** @type {import('next').NextConfig} */
const nextConfig = {
  // External packages for server components (moved from experimental in Next.js 15+)
  serverExternalPackages: ["mongoose"],

  // Enable experimental features for Next.js 15
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

  // Compiler optimizations for Tailwind CSS
  compiler: {
    // Remove unused imports
    removeConsole: process.env.NODE_ENV === "production",
  },

  // ESLint configuration - ignore linting during builds to prevent warnings from failing builds
  eslint: {
    // Ignore ESLint errors during builds - linting should be done separately
    ignoreDuringBuilds: true,
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
