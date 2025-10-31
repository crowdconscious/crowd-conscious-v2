import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile and corporate account
    const { data: profile } = await supabase
      .from('profiles')
      .select('corporate_account_id, role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 403 })
    }

    // Get corporate account details
    const { data: corporateAccount } = await supabase
      .from('corporate_accounts')
      .select('company_name')
      .eq('id', profile.corporate_account_id)
      .single()

    if (!corporateAccount) {
      return NextResponse.json({ error: 'Corporate account not found' }, { status: 404 })
    }

    // Get all course enrollments for this company
    const cleanAirCourseId = 'a1a1a1a1-1111-1111-1111-111111111111'
    
    const { data: enrollments } = await supabase
      .from('course_enrollments')
      .select('employee_id, completion_percentage, xp_earned')
      .eq('corporate_account_id', profile.corporate_account_id)
      .eq('course_id', cleanAirCourseId)
      .eq('completion_percentage', 100) // Only completed

    if (!enrollments || enrollments.length === 0) {
      return NextResponse.json({ certificates: [] })
    }

    // Generate certificates for completed modules
    // For now, we create one certificate per completed course
    const certificates = []

    // Check if any employee completed the Clean Air module
    if (enrollments.length > 0) {
      const totalXP = enrollments.reduce((sum, e) => sum + (e.xp_earned || 0), 0)
      const employeesCompleted = enrollments.length

      // Check if corporate certificate already exists
      const { data: existingCert } = await supabase
        .from('certifications')
        .select('*')
        .eq('corporate_account_id', profile.corporate_account_id)
        .eq('certification_type', 'corporate_module')
        .contains('modules_completed', ['clean_air'])
        .single()

      let corporateCert = existingCert

      // Create if doesn't exist
      if (!existingCert) {
        const verificationCode = Math.random().toString(36).substring(2, 14).toUpperCase()
        
        const { data: newCert } = await supabase
          .from('certifications')
          .insert({
            employee_id: user.id, // Use admin as representative
            corporate_account_id: profile.corporate_account_id,
            certification_type: 'corporate_module',
            certification_level: 'participant',
            modules_completed: ['clean_air'],
            verification_code: verificationCode,
            issued_at: new Date().toISOString()
          })
          .select()
          .single()

        corporateCert = newCert
      }

      if (corporateCert) {
        certificates.push({
          id: corporateCert.id,
          moduleName: 'Aire Limpio para Todos',
          moduleId: 'clean_air',
          companyName: corporateAccount.company_name,
          employeesCompleted,
          totalXP,
          issuedAt: corporateCert.issued_at,
          verificationCode: corporateCert.verification_code
        })
      }
    }

    return NextResponse.json({
      certificates,
      companyName: corporateAccount.company_name
    })

  } catch (error: any) {
    console.error('Error fetching corporate certificates:', error)
    return NextResponse.json({ 
      error: 'Server error', 
      details: error.message 
    }, { status: 500 })
  }
}

