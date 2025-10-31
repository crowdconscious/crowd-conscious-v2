import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const supabase = await createClient()

    // Search for certificate by verification code
    const { data: certificate, error } = await supabase
      .from('certifications')
      .select('*')
      .eq('verification_code', code.toUpperCase())
      .single()

    if (error || !certificate) {
      return NextResponse.json(
        { error: 'Certificate not found' },
        { status: 404 }
      )
    }

    // Get employee profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, corporate_account_id')
      .eq('id', certificate.employee_id)
      .single()

    // Get corporate account
    const { data: corporateAccount } = await supabase
      .from('corporate_accounts')
      .select('company_name')
      .eq('id', certificate.corporate_account_id)
      .single()

    // Format response based on certificate type
    let certificateData: any = {
      id: certificate.id,
      verificationCode: certificate.verification_code,
      issuedAt: certificate.issued_at,
      certificationType: certificate.certification_type,
      modules: certificate.modules_completed || []
    }

    if (certificate.certification_type === 'corporate_module') {
      // Corporate certificate
      const moduleId = certificate.modules_completed?.[0]
      let moduleName = 'Módulo Completado'
      
      if (moduleId === 'clean_air') {
        moduleName = 'Aire Limpio para Todos'
      } else if (moduleId === 'clean_water') {
        moduleName = 'Agua Limpia y Vida'
      } else if (moduleId === 'zero_waste') {
        moduleName = 'Cero Residuos'
      }

      // Get employee count for this company and module
      const cleanAirCourseId = 'a1a1a1a1-1111-1111-1111-111111111111'
      const { data: enrollments } = await supabase
        .from('course_enrollments')
        .select('employee_id, xp_earned')
        .eq('corporate_account_id', certificate.corporate_account_id)
        .eq('course_id', cleanAirCourseId)
        .eq('completion_percentage', 100)

      certificateData = {
        ...certificateData,
        companyName: corporateAccount?.company_name || 'Empresa',
        moduleName,
        employeesCompleted: enrollments?.length || 0,
        totalXP: enrollments?.reduce((sum, e) => sum + (e.xp_earned || 0), 0) || 0
      }
    } else {
      // Employee certificate
      const moduleId = certificate.modules_completed?.[0]
      let moduleName = 'Módulo Completado'
      
      if (moduleId === 'clean_air') {
        moduleName = 'Aire Limpio para Todos'
      } else if (moduleId === 'clean_water') {
        moduleName = 'Agua Limpia y Vida'
      } else if (moduleId === 'zero_waste') {
        moduleName = 'Cero Residuos'
      }

      certificateData = {
        ...certificateData,
        employeeName: profile?.full_name || 'Empleado',
        companyName: corporateAccount?.company_name || 'Empresa',
        moduleName,
        xpEarned: 750 // Default, can be fetched from enrollment
      }
    }

    return NextResponse.json({
      valid: true,
      certificate: certificateData
    })

  } catch (error: any) {
    console.error('Error verifying certificate:', error)
    return NextResponse.json(
      { error: 'Server error', details: error.message },
      { status: 500 }
    )
  }
}

