import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'

// Configure next-intl
const intlMiddleware = createIntlMiddleware({
  locales: ['es', 'en'],
  defaultLocale: 'es', // Spanish as default for Mexico
  localePrefix: 'as-needed' // Only show locale prefix for non-default (en)
})

export function middleware(request: NextRequest) {
  const startTime = Date.now()
  const { pathname } = request.nextUrl

  // Skip i18n for API routes, static files, and internal Next.js routes
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.includes('/favicon.ico') ||
    pathname.includes('/images/') ||
    pathname.includes('/fonts/')
  ) {
    const response = NextResponse.next()
    response.headers.set('x-request-start', startTime.toString())
    response.headers.set('x-pathname', pathname)
    return response
  }

  // Apply i18n middleware for all other routes
  const response = intlMiddleware(request)

  // Add monitoring headers
  response.headers.set('x-request-start', startTime.toString())
  response.headers.set('x-pathname', pathname)

  // Track page views for authenticated routes
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/communities')) {
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
