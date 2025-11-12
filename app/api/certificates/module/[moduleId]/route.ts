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

    // Get enrollment for this module with detailed logging
    console.log(`📍 Looking for enrollment: user_id=${user.id}, module_id=${moduleId}`)
    
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('course_enrollments')
      .select(`
        id,
        user_id,
        module_id,
        xp_earned,
        completed,
        completion_date,
        purchased_at,
        module:marketplace_modules(id, title, lesson_count, estimated_duration_minutes)
      `)
      .eq('user_id', user.id)
      .eq('module_id', moduleId)
      .maybeSingle()

    console.log('📊 Enrollment query result:', { enrollment, error: enrollmentError })

    if (!enrollment) {
      console.error('❌ No enrollment found')
      // Try to at least get module data
      const { data: moduleData } = await supabase
        .from('marketplace_modules')
        .select('id, title, lesson_count, estimated_duration_minutes')
        .eq('id', moduleId)
        .single()
      
      if (moduleData) {
        console.log('✅ Found module data, returning with defaults')
        return NextResponse.json({
          employeeName: profile?.full_name || 'Usuario',
          moduleName: moduleData.title || 'Módulo Completado',
          xpEarned: 250,
          issuedAt: new Date().toISOString(),
          verificationCode: `CC-${moduleId.slice(0, 8).toUpperCase()}`,
          module: {
            title: moduleData.title,
            lesson_count: moduleData.lesson_count || 5,
            duration: `${moduleData.estimated_duration_minutes || 45} min`
          }
        })
      }
      
      return NextResponse.json(
        { error: 'Enrollment not found for this module' },
        { status: 404 }
      )
    }

    // Extract module data (Supabase returns it as an object from the join)
    const moduleData = enrollment.module as any
    
    console.log('✅ Enrollment found:', {
      module: moduleData?.title,
      completed: enrollment.completed,
      xp: enrollment.xp_earned
    })

    // Build certificate data
    const certificateData = {
      employeeName: profile?.full_name || 'Usuario',
      moduleName: moduleData?.title || 'Módulo Completado',
      xpEarned: enrollment.xp_earned || 250,
      issuedAt: enrollment.completion_date || enrollment.purchased_at || new Date().toISOString(),
      verificationCode: `CC-${enrollment.id.slice(0, 8).toUpperCase()}`,
      module: {
        title: moduleData?.title,
        lesson_count: moduleData?.lesson_count || 5,
        duration: `${moduleData?.estimated_duration_minutes || 45} min`
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

