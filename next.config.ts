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
  async redirects() {
    return [
      // The /communities surface was deprecated in favor of /locations.
      // No app/communities pages exist, so any reference (legacy emails,
      // dashboard links, third-party shares) hits a 404 today. Permanent
      // redirect preserves SEO equity and keeps inbound clicks alive.
      {
        source: '/communities',
        destination: '/locations',
        permanent: true,
      },
      {
        source: '/communities/:path*',
        destination: '/locations',
        permanent: true,
      },
    ]
  },
};

export default nextConfig;
