import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    // Try the exact query the dashboard uses
    const { data: enrollments, error: enrollmentError } = await supabase
      .from('course_enrollments')
      .select(`
        *,
        module:marketplace_modules(
          id,
          title,
          description,
          core_value,
          slug
        )
      `)
      .eq('user_id', user.id)
      .order('purchased_at', { ascending: false })

    // Also try a simpler query
    const { data: simpleEnrollments, error: simpleError } = await supabase
      .from('course_enrollments')
      .select('*')
      .eq('user_id', user.id)

    // Get total count
    const { count } = await supabase
      .from('course_enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email
      },
      profile: {
        full_name: profile?.full_name,
        is_corporate_user: profile?.is_corporate_user,
        corporate_account_id: profile?.corporate_account_id
      },
      enrollmentQuery: {
        count: enrollments?.length || 0,
        error: enrollmentError,
        data: enrollments
      },
      simpleQuery: {
        count: simpleEnrollments?.length || 0,
        error: simpleError,
        data: simpleEnrollments
      },
      totalCount: count
    })

  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Server error', 
      details: error.message 
    }, { status: 500 })
  }
}

