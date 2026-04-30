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
  /**
   * Permanent (308) redirects. Next.js preserves the inbound query string
   * by default for these `source -> destination` mappings — utm_source,
   * session_id, etc. flow through without us having to thread them
   * manually. (We verified `/pulse/welcome?session_id=foo` survives.)
   *
   * NOTE on /predictions/markets/[id] (NOT redirected here):
   *   The spec asked for /predictions/markets/:id -> /pulse/:id. Adding
   *   that creates an infinite loop for non-Pulse markets, because
   *   /pulse/[id]/page.tsx (intentionally untouched per spec) internally
   *   redirects non-Pulse rows back to /predictions/markets/${id}. We
   *   skipped that single rule to avoid breaking ongoing Pulses and
   *   non-Pulse markets alike. Pulse share URLs are already canonical at
   *   /pulse/[id] (PulseResultClient renders there); regular market
   *   detail keeps living at /predictions/markets/[id].
   */
  async redirects() {
    return [
      // Legacy: /communities was deprecated in favor of /locations.
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

      // /predictions/markets list page is redundant with /predictions —
      // both render the personal predictions dashboard. Keep one source
      // of truth and let the dashboard handle filtering.
      {
        source: '/predictions/markets',
        destination: '/predictions',
        permanent: true,
      },

      // /markets is the legacy public alias of the Pulse listing. The
      // consumer-facing surface is /pulse now (formerly the B2B landing).
      {
        source: '/markets',
        destination: '/pulse',
        permanent: true,
      },

      // Legacy market detail alias. /pulse/[id] is the canonical
      // consumer share URL for Pulse markets; for non-Pulse markets the
      // Pulse page internally re-routes to /predictions/markets/${id}
      // (a real route), so this alias is loop-safe.
      {
        source: '/markets/:id',
        destination: '/pulse/:id',
        permanent: true,
      },

      // The B2B landing moved from /pulse to /para-marcas to clear the
      // /pulse namespace for consumers. Existing emails, receipts, ad
      // utm-tagged links continue to work (query string is preserved).
      {
        source: '/pulse/welcome',
        destination: '/para-marcas/welcome',
        permanent: true,
      },
      {
        source: '/pulse/pilot',
        destination: '/para-marcas/pilot',
        permanent: true,
      },
    ]
  },
};

export default nextConfig;
