import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/auth/reset-password
 * Server-side password reset email sending
 * Uses direct Supabase client (not SSR) for password reset
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      )
    }

    // Use direct Supabase client for password reset (doesn't need cookies)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    // Get the origin from the request or use environment variable
    const origin = request.headers.get('origin') || request.headers.get('host')
    const protocol = request.headers.get('x-forwarded-proto') || (origin?.includes('localhost') ? 'http' : 'https')
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (origin ? `${protocol}://${origin}` : 'http://localhost:3000')
    const redirectUrl = `${baseUrl}/reset-password`

    console.log('📧 Sending password reset email:', {
      email,
      redirectUrl,
      baseUrl,
      origin,
      protocol
    })

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    })

    if (error) {
      console.error('❌ Password reset error:', {
        message: error.message,
        status: error.status,
        name: error.name,
        fullError: error,
        errorString: JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
      })
      
      // Return the actual error message from Supabase
      // This helps debug configuration issues
      let errorMessage = error.message || 'Failed to send reset email'
      
      // Only show generic messages for rate limits
      if (error.message?.toLowerCase().includes('rate limit') || 
          error.message?.toLowerCase().includes('too many') ||
          error.status === 429) {
        errorMessage = 'Too many requests. Please wait a few minutes and try again.'
      } else {
        // For other errors, show the actual Supabase error message
        // This helps identify configuration issues like redirect URL problems
        errorMessage = error.message || 'Failed to send reset email. Please check your email address and try again.'
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          errorCode: error.status,
          errorName: error.name
        },
        { status: 400 }
      )
    }

    console.log('✅ Password reset email sent successfully', data)
    return NextResponse.json({
      success: true,
      message: 'Password reset email sent successfully'
    })
  } catch (error: any) {
    console.error('💥 Unexpected error:', {
      message: error?.message,
      stack: error?.stack,
      error: JSON.stringify(error, null, 2)
    })
    
    return NextResponse.json(
      { error: error?.message || 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}

