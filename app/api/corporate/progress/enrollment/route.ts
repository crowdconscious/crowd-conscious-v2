import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
      return NextResponse.json({ error: 'Unauthorized - No auth header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = getSupabaseAdmin()
    
    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 })
    }
    
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

