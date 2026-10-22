import { LEGACY_BADGE_REDIRECTS } from './lib/org/legacy-badge-redirects'
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
      // PR #60 published the paid seal at /sello; it is now "Sello verificado".
      // Old PR #60 badge files (embedded by orgs) -> renamed Sello verificado files.
      ...LEGACY_BADGE_REDIRECTS,
      { source: '/sello', destination: '/sello-verificado', permanent: true },
      // Modelo Consciente: XP, leaderboards and achievements are retired.
      // Old ranking URLs land on the private "Tus acciones" summary.
      { source: '/leaderboard', destination: '/predictions/acciones', statusCode: 301 },
      { source: '/achievements', destination: '/predictions/acciones', statusCode: 301 },
      { source: '/predictions/leaderboard', destination: '/predictions/acciones', statusCode: 301 },
      // Slug only (no dot), so the badge files in public/sello/*.svg|png are still served.
      { source: '/sello/:slug([a-z0-9-]+)', destination: '/sello-verificado/:slug', permanent: true },
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

      // B2B now lives at /organizaciones (Oct 2026). Exact path only:
      // /para-marcas/welcome stays live because the Pulse checkout
      // success_url and existing sponsor emails point there.
      {
        source: '/para-marcas',
        destination: '/organizaciones',
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
        destination: '/organizaciones/contratar',
        permanent: true,
      },
      // Brand Pulse sponsorship landing retired Oct 2026: /sponsor (exact)
      // now points to Patrocinio comunitario. Sub-routes (/sponsor/success,
      // /sponsor/login, /sponsor/report, /sponsor/blog…) stay live for legacy
      // sponsors and creator sponsorships.
      {
        source: '/sponsor',
        destination: '/patrocinio',
        permanent: true,
      },
      // Pilot checkout (and its founder-price offer) retired Oct 2026:
      // all pilot traffic goes to the Organizaciones hiring form.
      {
        source: '/para-marcas/pilot',
        destination: '/organizaciones/contratar',
        permanent: true,
      },
      {
        source: '/para-marcas/pilot/:path*',
        destination: '/organizaciones/contratar',
        permanent: true,
      },

      // Phase 0: kill Señales feature-intro page. Land on the feed
      // (verb-first: Reportar lives at /signals/nueva). Francisco must OK
      // before production — inbound/SEO risk on /signals/acerca.
      {
        source: '/signals/acerca',
        destination: '/signals',
        permanent: true,
      },
    ]
  },

  /**
   * Serve the iOS Universal Links association file with the correct
   * `application/json` content type. The file lives at
   * `public/.well-known/apple-app-site-association` (no extension), so
   * Next would otherwise serve it as octet-stream. (`assetlinks.json`
   * already gets `application/json` from its `.json` extension.)
   */
  async headers() {
    return [
      {
        source: '/.well-known/apple-app-site-association',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
      },
    ]
  },
};

export default nextConfig;
