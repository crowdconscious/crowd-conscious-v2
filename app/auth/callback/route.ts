import { createServerAuth } from '../../../lib/auth-server'
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
        
        // Check if user is a corporate admin
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('corporate_account_id')
            .eq('id', data.user.id)
            .single()
          
          if (profile?.corporate_account_id) {
            console.log('🏢 Corporate user detected, redirecting to corporate dashboard')
            return NextResponse.redirect(new URL('/corporate/dashboard', request.url))
          }
        } catch (profileError) {
          console.log('⚠️ Could not check corporate status:', profileError)
        }
        
        console.log('🔄 Regular user, redirecting to dashboard...')
        // Regular user, redirect to standard dashboard
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
