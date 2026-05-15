import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * CORS allow-list for the Citizen Signals public API. The Crowd Conscious
 * mobile app (`@blockstrand/crowd-conscious`) calls these endpoints with a
 * Supabase Bearer token; the production web origins are also included so
 * any first-party browser surface can hit them. Expo's `exp://` scheme is
 * allowed for local mobile development.
 *
 * TODO(signals-cors): once mobile pins a stable scheme/origin in production,
 * tighten this allow-list and drop the wildcard fallback.
 */
const SIGNALS_STATIC_ALLOWED_ORIGINS = new Set([
  'https://crowdconscious.app',
  'https://www.crowdconscious.app',
])

function isSignalsAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false
  if (SIGNALS_STATIC_ALLOWED_ORIGINS.has(origin)) return true
  if (origin.startsWith('exp://')) return true
  return false
}

function buildSignalsCorsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get('origin')
  const allow = isSignalsAllowedOrigin(origin) ? origin! : '*'
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

export function middleware(request: NextRequest) {
  const startTime = Date.now()
  const { pathname } = request.nextUrl

  // CORS for the Citizen Signals API. Browsers need both a preflight
  // (OPTIONS) response and CORS headers on the actual response. Mobile
  // (React Native) ignores CORS entirely — these headers are a no-op for
  // it but cost nothing to attach.
  if (pathname.startsWith('/api/signals')) {
    const corsHeaders = buildSignalsCorsHeaders(request)
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204, headers: corsHeaders })
    }
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-pathname', pathname)
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    })
    response.headers.set('x-request-start', startTime.toString())
    response.headers.set('x-pathname', pathname)
    for (const [k, v] of Object.entries(corsHeaders)) {
      response.headers.set(k, v)
    }
    return response
  }

  // Predictions: directly accessible (no gate)
  if (pathname.startsWith('/predictions')) {
    // Pass pathname to server components via request headers
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-pathname', pathname)

    const response = NextResponse.next({
      request: { headers: requestHeaders },
    })
    response.headers.set('x-request-start', startTime.toString())
    response.headers.set('x-pathname', pathname)
    return response
  }

  // Default: clone the response to add monitoring
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })

  // Add monitoring headers
  response.headers.set('x-request-start', startTime.toString())
  response.headers.set('x-pathname', pathname)

  // Track API requests (simplified for now)
  if (pathname.startsWith('/api/')) {
    const endTime = Date.now()
    const duration = endTime - startTime

    // Log slow requests
    if (duration > 3000) {
      console.warn(`Slow API request: ${pathname} took ${duration}ms`)
    }
  }

  // Track page views for authenticated routes
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/predictions')) {
    // This will be picked up by the client-side analytics tracker
    response.headers.set('x-track-page-view', 'true')
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
