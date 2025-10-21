import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Ensure proper cache behavior for dynamic content
  experimental: {
    staleTimes: {
      dynamic: 0, // Don't cache dynamic pages
      static: 180, // Cache static pages for 3 minutes
    },
  },
};

export default nextConfig;
