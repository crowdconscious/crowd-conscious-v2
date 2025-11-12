import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ✅ Get user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('corporate_account_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // ✅ FIXED: Use JOIN instead of separate queries
    const { data: enrollments } = await supabase
      .from('course_enrollments')
      .select(`
        *,
        responses:lesson_responses(
          time_spent_minutes,
          carbon_data,
          cost_data,
          completed
        )
      `)
      .eq('user_id', user.id)

    // Calculate personal metrics
    const totalXP = enrollments?.reduce((sum, e) => sum + (e.xp_earned || 0), 0) || 0
    const modulesCompleted = enrollments?.filter(e => e.completed === true).length || 0

    // Extract responses from joined data
    const responses = enrollments?.flatMap(e => 
      (e.responses || []).filter((r: any) => r.completed === true)
    ) || []

    const timeSpentMinutes = responses?.reduce((sum, r) => sum + (r.time_spent_minutes || 0), 0) || 0
    const timeSpentHours = Math.round(timeSpentMinutes / 60)

    // ✅ Calculate REAL impact metrics from actual calculator data
    let co2Reduced = 0
    let costSavings = 0

    responses?.forEach(r => {
      // Sum carbon footprint data
      if (r.carbon_data) {
        co2Reduced += r.carbon_data.totalCO2 || r.carbon_data.annualCO2 || 0
      }
      // Sum cost savings data
      if (r.cost_data) {
        costSavings += r.cost_data.annualSavings || r.cost_data.threeYearSavings || 0
      }
    })

    // Round to integers
    co2Reduced = Math.round(co2Reduced)
    costSavings = Math.round(costSavings)

    // ✅ Get company-wide stats (only if corporate user)
    let companyEmployeeCount = 0
    let companyTotalXP = 0

    if (profile.corporate_account_id) {
      const { data: companyEnrollments } = await supabase
        .from('course_enrollments')
        .select('user_id, xp_earned')
        .eq('corporate_account_id', profile.corporate_account_id)

      const uniqueEmployees = new Set(companyEnrollments?.map(e => e.user_id) || [])
      companyEmployeeCount = uniqueEmployees.size
      companyTotalXP = companyEnrollments?.reduce((sum, e) => sum + (e.xp_earned || 0), 0) || 0
    }

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

