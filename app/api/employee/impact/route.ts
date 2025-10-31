import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('corporate_account_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get user's course enrollments
    const cleanAirCourseId = 'a1a1a1a1-1111-1111-1111-111111111111'
    
    const { data: enrollments } = await supabase
      .from('course_enrollments')
      .select('*')
      .eq('employee_id', user.id)
      .eq('course_id', cleanAirCourseId)

    // Calculate personal metrics
    const totalXP = enrollments?.reduce((sum, e) => sum + (e.xp_earned || 0), 0) || 0
    const modulesCompleted = enrollments?.filter(e => e.completion_percentage === 100).length || 0

    // Get lesson responses for time calculation
    const { data: responses } = await supabase
      .from('lesson_responses')
      .select('time_spent')
      .eq('employee_id', user.id)
      .eq('course_id', cleanAirCourseId)

    const timeSpentMinutes = responses?.reduce((sum, r) => sum + (r.time_spent || 0), 0) || 0
    const timeSpentHours = Math.round(timeSpentMinutes / 60)

    // Calculate impact metrics (simulated based on XP and activities)
    // In a real app, these would come from actual calculator data stored in lesson_responses
    const co2Reduced = Math.floor(totalXP / 10) // 1 kg CO2 per 10 XP
    const costSavings = Math.floor(totalXP / 5) // $1 saved per 5 XP

    // Get company-wide stats
    const { data: companyEnrollments } = await supabase
      .from('course_enrollments')
      .select('employee_id, xp_earned')
      .eq('corporate_account_id', profile.corporate_account_id)
      .eq('course_id', cleanAirCourseId)

    const uniqueEmployees = new Set(companyEnrollments?.map(e => e.employee_id) || [])
    const companyEmployeeCount = uniqueEmployees.size
    const companyTotalXP = companyEnrollments?.reduce((sum, e) => sum + (e.xp_earned || 0), 0) || 0

    return NextResponse.json({
      totalXP,
      modulesCompleted,
      timeSpentHours,
      co2Reduced,
      costSavings,
      companyEmployeeCount,
      companyTotalXP
    })

  } catch (error: any) {
    console.error('Error fetching employee impact:', error)
    return NextResponse.json({ 
      error: 'Server error', 
      details: error.message 
    }, { status: 500 })
  }
}

