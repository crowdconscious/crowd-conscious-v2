import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

/**
 * GET /api/certificates/module/[moduleId]
 * 
 * Fetches complete certificate data for a specific module
 * Returns: user name, module title, XP earned, completion date, verification code
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ moduleId: string }> }
) {
  try {
    const { moduleId } = await context.params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`🎓 Fetching certificate for user ${user.id}, module ${moduleId}`)

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    // Get enrollment for this module
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('course_enrollments')
      .select(`
        *,
        module:marketplace_modules(id, title, lesson_count, estimated_duration_minutes)
      `)
      .eq('user_id', user.id)
      .eq('module_id', moduleId)
      .single()

    if (enrollmentError) {
      console.error('❌ Enrollment not found:', enrollmentError)
      return NextResponse.json(
        { error: 'Enrollment not found for this module' },
        { status: 404 }
      )
    }

    console.log('✅ Enrollment found:', {
      module: enrollment.module?.title,
      completed: enrollment.completed,
      xp: enrollment.xp_earned
    })

    // Build certificate data
    const certificateData = {
      employeeName: profile?.full_name || 'Usuario',
      moduleName: enrollment.module?.title || 'Módulo Completado',
      xpEarned: enrollment.xp_earned || 250,
      issuedAt: enrollment.completion_date || enrollment.purchased_at || new Date().toISOString(),
      verificationCode: `CC-${enrollment.id.slice(0, 8).toUpperCase()}`,
      module: {
        title: enrollment.module?.title,
        lesson_count: enrollment.module?.lesson_count || 5,
        duration: `${enrollment.module?.estimated_duration_minutes || 45} min`
      }
    }

    console.log('📜 Certificate generated successfully')
    return NextResponse.json(certificateData)

  } catch (error: any) {
    console.error('💥 Error fetching certificate:', error)
    return NextResponse.json(
      { error: 'Server error', details: error.message },
      { status: 500 }
    )
  }
}

