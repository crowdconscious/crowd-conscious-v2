import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { ApiResponse } from '@/lib/api-responses'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return ApiResponse.unauthorized('Please log in to view certificates')
    }

    // ✅ Get all COMPLETED enrollments (these are the certificates!)
    const { data: completedEnrollments, error } = await supabase
      .from('course_enrollments')
      .select(`
        *,
        module:marketplace_modules(
          id,
          title,
          core_value,
          slug
        )
      `)
      .eq('user_id', user.id)
      .eq('completed', true)
      .order('completion_date', { ascending: false })

    if (error) {
      console.error('Error fetching certificates:', error)
      return NextResponse.json({ 
        certificates: [],
        error: error.message 
      })
    }

    console.log('📜 Certificates API - Completed enrollments:', {
      count: completedEnrollments?.length || 0,
      enrollments: completedEnrollments
    })

    // Map to friendly format
    const formattedCerts = (completedEnrollments || []).map(enrollment => {
      const moduleData = enrollment.module
      const moduleId = moduleData?.id || enrollment.module_id
      const moduleName = moduleData?.title || 'Módulo Completado'

      return {
        id: enrollment.id,
        moduleId: moduleId,
        moduleName: moduleName,
        verificationCode: `CC-${enrollment.id.slice(0, 8).toUpperCase()}`,
        issuedAt: enrollment.completed_at || enrollment.completion_date || enrollment.purchased_at,  // ✅ PHASE 3: Use completed_at first
        certificateUrl: enrollment.certificate_url,
        xpEarned: enrollment.xp_earned || 250
      }
    })

    return NextResponse.json({
      certificates: formattedCerts
    })

  } catch (error: any) {
    console.error('Error in my-certificates API:', error)
    return ApiResponse.serverError('Failed to fetch certificates', 'CERTIFICATES_FETCH_ERROR', { message: error.message })
  }
}

