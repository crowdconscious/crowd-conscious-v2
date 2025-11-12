import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

/**
 * POST /api/corporate/self-enroll
 * Allows corporate admins to enroll themselves in courses
 */
export async function POST(req: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
      return NextResponse.json({ error: 'Only corporate admins can self-enroll' }, { status: 403 })
    }

    // Check if already enrolled
    const { data: existingEnrollment } = await supabase
      .from('course_enrollments')
      .select('id')
      .eq('employee_id', user.id)
      .eq('course_id', courseId)
      .single()

    if (existingEnrollment) {
      return NextResponse.json({ error: 'Already enrolled' }, { status: 400 })
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
      return NextResponse.json({ error: 'Failed to enroll' }, { status: 500 })
    }

    console.log('✅ Admin self-enrolled:', user.id, 'in course:', courseId)

    return NextResponse.json({
      success: true,
      enrollment
    })
  } catch (error) {
    console.error('Self-enrollment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

