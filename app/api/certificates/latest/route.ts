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
      .select('full_name, corporate_account_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // ✅ Get corporate account (optional for individual users)
    let companyName = null
    if (profile.corporate_account_id) {
      const { data: corporateAccount } = await supabase
        .from('corporate_accounts')
        .select('company_name')
        .eq('id', profile.corporate_account_id)
        .single()
      
      companyName = corporateAccount?.company_name || null
    }

    // Get latest completed module from enrollments
    const { data: latestEnrollment } = await supabase
      .from('course_enrollments')
      .select(`
        *,
        module:marketplace_modules(title)
      `)
      .eq('user_id', user.id)
      .eq('completed', true)
      .order('completion_date', { ascending: false })
      .limit(1)
      .single()

    if (!latestEnrollment) {
      console.log('No completed modules found')
      // Return default data if no certificate exists yet
      return NextResponse.json({
        employeeName: profile.full_name,
        companyName: companyName,
        verificationCode: 'PENDING',
        issuedAt: new Date().toISOString(),
        xpEarned: 0,
        modulesCompleted: 0
      })
    }

    // Calculate total XP and modules from all completions
    const { data: allCompletions } = await supabase
      .from('course_enrollments')
      .select('xp_earned')
      .eq('user_id', user.id)
      .eq('completed', true)

    const totalXP = allCompletions?.reduce((sum, e) => sum + (e.xp_earned || 0), 0) || 0
    const modulesCompleted = allCompletions?.length || 0

    return NextResponse.json({
      id: latestEnrollment.id,
      employeeName: profile.full_name,
      companyName: companyName,
      moduleName: latestEnrollment.module?.title || 'Módulo Completado',
      verificationCode: `CC-${latestEnrollment.id.slice(0, 8).toUpperCase()}`,
      certificateUrl: latestEnrollment.certificate_url,
      modulesCompleted: modulesCompleted,
      issuedAt: latestEnrollment.completion_date || latestEnrollment.purchased_at,
      xpEarned: totalXP
    })

  } catch (error: any) {
    console.error('Error fetching certificate:', error)
    return NextResponse.json({ 
      error: 'Server error', 
      details: error.message 
    }, { status: 500 })
  }
}

