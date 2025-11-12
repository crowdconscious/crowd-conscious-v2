import { createClient } from '@/lib/supabase-server'
import { NextRequest } from 'next/server'
import { ApiResponse } from '@/lib/api-responses'

/**
 * POST /api/corporate/self-enroll
 * Allows corporate admins to enroll themselves in courses
 */
export async function POST(req: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return ApiResponse.unauthorized('Please log in to enroll')
  }

  try {
    const { courseId } = await req.json()

    // Verify user is a corporate admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('corporate_account_id, corporate_role, is_corporate_user')
      .eq('id', user.id)
      .single()

    if (!profile?.is_corporate_user || profile.corporate_role !== 'admin') {
      return ApiResponse.forbidden('Only corporate admins can self-enroll', 'ADMIN_ONLY')
    }

    // Check if already enrolled
    const { data: existingEnrollment } = await supabase
      .from('course_enrollments')
      .select('id')
      .eq('employee_id', user.id)
      .eq('course_id', courseId)
      .single()

    if (existingEnrollment) {
      return ApiResponse.conflict('Already enrolled in this course', 'ALREADY_ENROLLED')
    }

    // Create enrollment (using only columns that exist)
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('course_enrollments')
      .insert({
        employee_id: user.id,
        corporate_account_id: profile.corporate_account_id,
        course_id: courseId,
        status: 'not_started',
        progress_percentage: 0,  // ✅ PHASE 3: Use standardized field
        completion_percentage: 0,  // Keep for backward compatibility
        modules_completed: 0,
        xp_earned: 0,
      })
      .select()
      .single()

    if (enrollmentError) {
      console.error('Enrollment error:', enrollmentError)
      return ApiResponse.serverError('Failed to enroll', 'ENROLLMENT_CREATION_ERROR', enrollmentError)
    }

    console.log('✅ Admin self-enrolled:', user.id, 'in course:', courseId)

    return ApiResponse.created({ enrollment })
  } catch (error: any) {
    console.error('Self-enrollment error:', error)
    return ApiResponse.serverError('Internal server error during enrollment', 'SELF_ENROLLMENT_ERROR', { message: error.message })
  }
}

