import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const startTime = Date.now()
  const { pathname } = request.nextUrl

  // Predictions access gate: /predictions/* (except /predictions/gate)
  if (pathname.startsWith('/predictions')) {
    const isGatePage = pathname === '/predictions/gate'

    if (!isGatePage) {
      const cookieValue = request.cookies.get('predictions_access')?.value
      const expectedCode = process.env.PREDICTIONS_ACCESS_CODE

      if (!expectedCode || cookieValue !== expectedCode) {
        return NextResponse.redirect(new URL('/predictions/gate', request.url))
      }
    }

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
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/communities')) {
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
