/**
 * Error monitoring (Sentry). Inert until SENTRY_DSN is set in Vercel, so this
 * is safe to ship before the Sentry project exists. No source-map upload
 * (withSentryConfig) yet: stack traces point at compiled code, which is fine
 * for alerting. See docs/OPS-MONITORING.md.
 */
import * as Sentry from '@sentry/nextjs'

export async function register() {
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
  if (!dsn) return
  if (process.env.NEXT_RUNTIME === 'nodejs' || process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn,
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
      release: process.env.VERCEL_GIT_COMMIT_SHA,
      tracesSampleRate: 0,
      sendDefaultPii: false,
    })
  }
}

export const onRequestError = Sentry.captureRequestError
