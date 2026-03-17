import { createServerAuth } from '../../../lib/auth-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', request.url))
  }

  const supabase = await createServerAuth()

  try {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('[AUTH-CALLBACK] exchangeCodeForSession failed:', error)
      return NextResponse.redirect(new URL('/login?error=confirmation_failed', request.url))
    }

    if (!data.session || !data.user) {
      console.error('[AUTH-CALLBACK] No session after exchange')
      return NextResponse.redirect(new URL('/login?error=session_failed', request.url))
    }

    // Ensure profile + user_stats exist (idempotent)
    const baseUrl = request.nextUrl.origin
    try {
      const res = await fetch(`${baseUrl}/api/auth/ensure-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: data.user.id }),
      })
      if (!res.ok) {
        console.warn('[AUTH-CALLBACK] ensure-profile returned', res.status)
      }
    } catch (err) {
      console.error('[AUTH-CALLBACK] ensure-profile call failed:', err)
      // Don't block redirect — getCurrentUser fallback will create profile on first load
    }

    return NextResponse.redirect(new URL('/predictions', request.url))
  } catch (error) {
    console.error('[AUTH-CALLBACK] Exception:', error)
    return NextResponse.redirect(new URL('/login?error=confirmation_failed', request.url))
  }
}
