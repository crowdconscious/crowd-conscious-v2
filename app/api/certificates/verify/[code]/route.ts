import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    
    if (!code) {
      return NextResponse.json({ 
        valid: false,
        error: 'No se proporcionó código de verificación' 
      }, { status: 400 })
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
      return NextResponse.json({ 
        valid: false,
        error: 'Error al verificar el certificado',
        details: error.message 
      }, { status: 500 })
    }

    console.log('📜 Total completed enrollments:', allEnrollments?.length || 0)

    // Filter for enrollment IDs that start with the code prefix
    const enrollments = allEnrollments?.filter(e => 
      e.id.toLowerCase().startsWith(codePrefix)
    ) || []

    console.log('📜 Matching enrollments:', enrollments.length)

    if (enrollments.length === 0) {
      console.log('❌ No enrollment found matching code:', code)
      return NextResponse.json({ 
        valid: false,
        error: 'Certificado no encontrado. Verifica que el código sea correcto.' 
      }, { status: 404 })
    }

    const enrollment = enrollments[0]
    const userData = enrollment.user
    const moduleData = enrollment.module

    console.log('✅ Certificate verified:', {
      enrollment_id: enrollment.id,
      user: userData?.full_name,
      module: moduleData?.title
    })

    return NextResponse.json({
      valid: true,
      verificationCode: code.toUpperCase(),
      certificateHolder: userData?.full_name || 'Usuario',
      moduleName: moduleData?.title || 'Módulo Completado',
      issuedAt: enrollment.completion_date || enrollment.purchased_at,
      xpEarned: enrollment.xp_earned || 250,
      completionDate: enrollment.completion_date,
      enrollmentId: enrollment.id
    })

  } catch (error: any) {
    console.error('Error in certificate verification:', error)
    return NextResponse.json({ 
      valid: false,
      error: 'Error del servidor al verificar el certificado',
      details: error.message 
    }, { status: 500 })
  }
}
