import { NextRequest, NextResponse } from 'next/server'
import { createServerAuth } from '@/lib/auth-server'

/**
 * POST /api/auth/reset-password
 * Server-side password reset email sending
 * This avoids client-side timeout issues
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const supabase = await createServerAuth()
    
    // Get the origin from the request or use environment variable
    const origin = request.headers.get('origin') || request.headers.get('host')
    const protocol = request.headers.get('x-forwarded-proto') || (origin?.includes('localhost') ? 'http' : 'https')
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (origin ? `${protocol}://${origin}` : 'http://localhost:3000')
    const redirectUrl = `${baseUrl}/reset-password`

    console.log('📧 Sending password reset email:', {
      email,
      redirectUrl
    })

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    })

    if (error) {
      console.error('❌ Password reset error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    console.log('✅ Password reset email sent successfully')
    return NextResponse.json({
      success: true,
      message: 'Password reset email sent successfully'
    })
  } catch (error: any) {
    console.error('💥 Unexpected error:', error)
    return NextResponse.json(
      { error: error?.message || 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

