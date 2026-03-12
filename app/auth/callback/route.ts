import { createServerAuth } from '../../../lib/auth-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createServerAuth()

    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error('Auth callback error:', error)
        return NextResponse.redirect(new URL('/login?error=auth_callback_error', request.url))
      }

      if (data.user) {
        // Safety net: ensure profile exists (trigger should have created it)
        const baseUrl = request.nextUrl.origin
        try {
          await fetch(`${baseUrl}/api/auth/ensure-profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: data.user.id }),
          })
        } catch (err) {
          console.error('Ensure-profile call failed:', err)
        }
        return NextResponse.redirect(new URL('/predictions', request.url))
      }
    } catch (error) {
      console.error('Auth callback exception:', error)
      return NextResponse.redirect(new URL('/login?error=auth_callback_exception', request.url))
    }
  }

  return NextResponse.redirect(new URL('/', request.url))
}
