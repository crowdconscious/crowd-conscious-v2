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
        console.log('User email:', data.user.email)
        
        // Check user type and corporate role
        try {
          console.log('🔍 Fetching profile for user:', data.user.id)
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('corporate_account_id, corporate_role, is_corporate_user, email, full_name')
            .eq('id', data.user.id)
            .single()
          
          console.log('📋 Profile data:', {
            found: !!profile,
            email: profile?.email,
            corporate_account_id: profile?.corporate_account_id,
            corporate_role: profile?.corporate_role,
            is_corporate_user: profile?.is_corporate_user,
            error: profileError
          })
          
          if (profile?.is_corporate_user && profile?.corporate_account_id) {
            // Corporate user - check role
            if (profile.corporate_role === 'admin') {
              console.log('🏢 Corporate admin detected, redirecting to corporate dashboard')
              return NextResponse.redirect(new URL('/corporate/dashboard', request.url))
            } else if (profile.corporate_role === 'employee') {
              console.log('👤 Corporate employee detected, redirecting to employee portal')
              return NextResponse.redirect(new URL('/employee-portal/dashboard', request.url))
            } else {
              console.log('⚠️ Corporate user but unknown role:', profile.corporate_role)
            }
          } else {
            console.log('ℹ️ Not a corporate user (is_corporate_user:', profile?.is_corporate_user, ', corporate_account_id:', profile?.corporate_account_id, ')')
          }
        } catch (profileError) {
          console.error('❌ Error checking corporate status:', profileError)
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
