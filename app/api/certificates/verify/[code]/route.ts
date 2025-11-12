import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { ApiResponse } from '@/lib/api-responses'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    
    if (!code) {
      return ApiResponse.badRequest('No se proporcionó código de verificación', 'MISSING_VERIFICATION_CODE')
    }

    const supabase = await createClient()

    // Verification codes are in format: CC-XXXXXXXX (where XXXXXXXX is first 8 chars of enrollment ID)
    // Extract the enrollment ID prefix from the code
    const codePrefix = code.replace('CC-', '').toLowerCase()

    console.log('🔍 Verifying certificate with code:', code)
    console.log('🔍 Looking for enrollment IDs starting with:', codePrefix)

    // Get ALL completed enrollments and filter in JavaScript
    // (UUID fields can't use ILIKE directly in Supabase)
    const { data: allEnrollments, error } = await supabase
      .from('course_enrollments')
      .select(`
        *,
        user:profiles!user_id(full_name, email),
        module:marketplace_modules(id, title, core_value, slug)
      `)
      .eq('completed', true)

    if (error) {
      console.error('Error querying enrollments:', error)
      return ApiResponse.serverError('Error al verificar el certificado', 'CERTIFICATE_VERIFICATION_ERROR', { message: error.message })
    }

    console.log('📜 Total completed enrollments:', allEnrollments?.length || 0)

    // Filter for enrollment IDs that start with the code prefix
    const enrollments = allEnrollments?.filter(e => 
      e.id.toLowerCase().startsWith(codePrefix)
    ) || []

    console.log('📜 Matching enrollments:', enrollments.length)

    if (enrollments.length === 0) {
      console.log('❌ No enrollment found matching code:', code)
      return ApiResponse.notFound('Certificado', 'CERTIFICATE_NOT_FOUND')
    }

    const enrollment = enrollments[0]
    const userData = enrollment.user
    const moduleData = enrollment.module

    console.log('✅ Certificate verified:', {
      enrollment_id: enrollment.id,
      user: userData?.full_name,
      module: moduleData?.title
    })

    return ApiResponse.ok({
      valid: true,
      verificationCode: code.toUpperCase(),
      certificateHolder: userData?.full_name || 'Usuario',
      moduleName: moduleData?.title || 'Módulo Completado',
      issuedAt: enrollment.completed_at || enrollment.completion_date || enrollment.purchased_at,  // ✅ PHASE 3: Use completed_at first
      xpEarned: enrollment.xp_earned || 250,
      completionDate: enrollment.completed_at || enrollment.completion_date,  // ✅ PHASE 3: Use completed_at first
      enrollmentId: enrollment.id
    })

  } catch (error: any) {
    console.error('Error in certificate verification:', error)
    return ApiResponse.serverError('Error del servidor al verificar el certificado', 'CERTIFICATE_VERIFICATION_SERVER_ERROR', { message: error.message })
  }
}
