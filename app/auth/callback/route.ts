import { createServerAuth } from '../../../lib/auth-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  console.log('🔄 Auth callback triggered')
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  
  console.log('📝 Callback params:', {
    hasCode: !!code,
    codePreview: code?.substring(0, 20) + '...',
    url: request.url
  })

  if (code) {
    console.log('🔐 Exchanging code for session...')
    const supabase = await createServerAuth()
    
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      console.log('📦 Exchange result:', {
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        hasError: !!error,
        errorMessage: error?.message
      })
      
      if (error) {
        console.error('❌ Auth callback error:', error)
        return NextResponse.redirect(new URL('/login?error=auth_callback_error', request.url))
      }

      if (data.user) {
        console.log('✅ Session exchanged successfully, user:', data.user.id)
        // Ensure profile exists (handles signup flow where user closed browser before ensure-profile ran)
        try {
          const admin = createAdminClient()
          const { data: existing } = await admin
            .from('profiles')
            .select('id')
            .eq('id', data.user.id)
            .single()
          if (!existing) {
            await admin.from('profiles').insert({
              id: data.user.id,
              email: data.user.email ?? '',
              full_name: data.user.user_metadata?.full_name ?? data.user.email ?? 'User',
              user_type: 'user',
            })
            console.log('✅ Profile created in auth callback')
          }
        } catch (profileErr) {
          const msg = (profileErr as Error)?.message ?? ''
          if (!msg.includes('duplicate') && !msg.includes('unique')) {
            console.error('⚠️ Profile ensure failed in callback:', profileErr)
          }
        }
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    } catch (error: any) {
      console.error('💥 Auth callback exception:', error)
      console.error('Exception details:', {
        message: error?.message,
        stack: error?.stack
      })
      return NextResponse.redirect(new URL('/login?error=auth_callback_exception', request.url))
    }
  }

  console.log('⚠️ No code parameter, redirecting to home')
  // No code parameter, redirect to home
  return NextResponse.redirect(new URL('/', request.url))
}
