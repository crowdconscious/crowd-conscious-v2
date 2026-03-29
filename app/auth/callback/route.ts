import { createServerAuth } from '../../../lib/auth-server'
import { createAdminClient } from '../../../lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

function clearAnonymousAliasCookies(response: NextResponse) {
  const secure = process.env.NODE_ENV === 'production'
  const base = { path: '/', maxAge: 0, sameSite: 'lax' as const, httpOnly: true, secure }
  response.cookies.set('cc_session', '', base)
  response.cookies.set('cc_alias', '', base)
  response.cookies.set('cc_emoji', '', base)
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const nextParam = searchParams.get('next')
  const safeNext =
    nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : null

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

    const sessionId = request.cookies.get('cc_session')?.value
    if (sessionId) {
      try {
        const admin = createAdminClient()
        const { data: conv, error: convErr } = await admin.rpc('convert_anonymous_to_user', {
          p_session_id: sessionId,
          p_user_id: data.user.id,
        })
        if (convErr) {
          console.warn('[AUTH-CALLBACK] convert_anonymous_to_user:', convErr.message)
        } else if (conv && typeof conv === 'object' && 'success' in conv && conv.success) {
          console.info(
            '[AUTH-CALLBACK] Anonymous converted:',
            (conv as { alias?: string }).alias,
            'xp:',
            (conv as { transferred_xp?: number }).transferred_xp
          )
        }
      } catch (e) {
        console.warn('[AUTH-CALLBACK] convert_anonymous_to_user failed:', e)
      }
    }

    const dest = safeNext ?? '/predictions'
    const response = NextResponse.redirect(new URL(dest, request.url))
    if (sessionId) {
      clearAnonymousAliasCookies(response)
    }
    return response
  } catch (error) {
    console.error('[AUTH-CALLBACK] Exception:', error)
    return NextResponse.redirect(new URL('/login?error=confirmation_failed', request.url))
  }
}
