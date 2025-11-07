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

    // Find completed enrollment where ID starts with this prefix
    const { data: enrollments, error } = await supabase
      .from('course_enrollments')
      .select(`
        *,
        user:profiles!user_id(full_name, email),
        module:marketplace_modules(id, title, core_value, slug)
      `)
      .eq('completed', true)
      .ilike('id', `${codePrefix}%`)
      .limit(1)

    if (error) {
      console.error('Error querying enrollments:', error)
      return NextResponse.json({ 
        valid: false,
        error: 'Error al verificar el certificado' 
      }, { status: 500 })
    }

    console.log('📜 Enrollments found:', enrollments?.length || 0)

    if (!enrollments || enrollments.length === 0) {
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
