import { ApiResponse } from '@/lib/api-responses'

// Test all integrations endpoint
export async function GET() {
  try {
    const results = {
      timestamp: new Date().toISOString(),
      integrations: {
        resend: {
          configured: !!process.env.RESEND_API_KEY,
          status: process.env.RESEND_API_KEY ? 'configured' : 'not_configured',
          domains_count: process.env.RESEND_API_KEY ? 'unknown' : 0
        },
        supabase: {
          configured: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
          url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'not_configured',
          anon_key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'configured' : 'not_configured'
        },
        stripe: {
          configured: !!process.env.STRIPE_SECRET_KEY,
          publishable_key: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
          status: process.env.STRIPE_SECRET_KEY ? 'configured' : 'not_configured'
        },
        app: {
          url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          environment: process.env.NODE_ENV || 'development'
        }
      },
      recommendations: [] as string[]
    }

    // Add recommendations based on configuration
    if (!process.env.RESEND_API_KEY) {
      results.recommendations.push('Set RESEND_API_KEY environment variable for email functionality')
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      results.recommendations.push('Set NEXT_PUBLIC_SUPABASE_URL environment variable')
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      results.recommendations.push('Set NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
    }
    if (!process.env.STRIPE_SECRET_KEY) {
      results.recommendations.push('Set STRIPE_SECRET_KEY environment variable for payment functionality')
    }

    return ApiResponse.ok(results)
  } catch (error: any) {
    console.error('Integration test error:', error)
    return ApiResponse.serverError('Failed to test integrations', 'INTEGRATION_TEST_ERROR', { message: error.message })
  }
}