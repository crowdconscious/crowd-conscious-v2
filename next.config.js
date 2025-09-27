/** @type {import('next').NextConfig} */
const { withSentryConfig } = require('@sentry/nextjs')

const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@sentry/nextjs']
  },
  // Enable analytics for Vercel deployments
  analytics: {
    enabled: true
  },
  // Environment variables for monitoring
  env: {
    MONITORING_ENABLED: process.env.MONITORING_ENABLED || 'true',
    PAGE_LOAD_THRESHOLD: process.env.PAGE_LOAD_THRESHOLD || '3000',
    API_RESPONSE_THRESHOLD: process.env.API_RESPONSE_THRESHOLD || '3000'
  },
  // Headers for performance monitoring
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'X-Monitoring-Enabled',
            value: 'true'
          }
        ]
      }
    ]
  }
}

const sentryWebpackPluginOptions = {
  // Additional config options for the Sentry Webpack plugin
  silent: true, // Suppresses source map uploading logs during build
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
}

const sentryOptions = {
  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Transpiles SDK to be compatible with IE11 (increases bundle size)
  transpileClientSDK: true,

  // Routes browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers
  tunnelRoute: "/monitoring",

  // Hides source maps from generated client bundles
  hideSourceMaps: true,

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors.
  automaticVercelMonitors: true,
}

// Make sure adding Sentry options is the last code to run before exporting
module.exports = process.env.NODE_ENV === 'production' 
  ? withSentryConfig(nextConfig, sentryWebpackPluginOptions, sentryOptions)
  : nextConfig
