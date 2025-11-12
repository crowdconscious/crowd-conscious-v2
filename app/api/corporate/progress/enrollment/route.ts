import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ApiResponse } from '@/lib/api-responses'

/**
 * GET /api/corporate/progress/enrollment?moduleId={moduleId}
 * 
 * Fetches the enrollment data for a specific module for the current user
 * Used by certificate page to get module-specific completion data
 */

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

export async function GET(req: NextRequest) {
  try {
    // Get user from request headers
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return ApiResponse.unauthorized('No authorization header provided', 'MISSING_AUTH_HEADER')
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = getSupabaseAdmin()
    
    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return ApiResponse.unauthorized('Invalid or expired token', 'INVALID_TOKEN')
    }

    const { searchParams } = new URL(req.url)
    const moduleId = searchParams.get('moduleId')

    if (!moduleId) {
      return ApiResponse.badRequest('moduleId is required', 'MISSING_MODULE_ID')
    }

    // Get user's enrollment for this specific module
    const { data: enrollment, error } = await supabase
      .from('course_enrollments')
      .select(`
        *,
        module:marketplace_modules(id, title, lesson_count, duration),
        profile:profiles(id, full_name)
      `)
      .eq('user_id', user.id)
      .eq('module_id', moduleId)
      .single()

    if (error || !enrollment) {
      return ApiResponse.notFound('Enrollment', 'ENROLLMENT_NOT_FOUND')
    }

    return ApiResponse.ok(enrollment)
  } catch (error: any) {
    console.error('Error fetching enrollment:', error)
    return ApiResponse.serverError('Server error', 'ENROLLMENT_FETCH_ERROR', { message: error.message })
  }
}

