import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

/**
 * GET /api/corporate/progress/enrollment?moduleId={moduleId}
 * 
 * Fetches the enrollment data for a specific module for the current user
 * Used by certificate page to get module-specific completion data
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const moduleId = searchParams.get('moduleId')

    if (!moduleId) {
      return NextResponse.json({ error: 'moduleId is required' }, { status: 400 })
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
      return NextResponse.json(
        { error: 'Enrollment not found for this module' },
        { status: 404 }
      )
    }

    return NextResponse.json(enrollment)
  } catch (error: any) {
    console.error('Error fetching enrollment:', error)
    return NextResponse.json(
      { error: 'Server error', details: error.message },
      { status: 500 }
    )
  }
}

