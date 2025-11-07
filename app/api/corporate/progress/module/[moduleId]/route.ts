import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  try {
    const { moduleId } = await params
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get enrollment using CORRECT column names (user_id, module_id)
    const { data: enrollment, error } = await supabase
      .from('course_enrollments')
      .select('id, xp_earned, progress_percentage')  // FIXED: correct column names
      .eq('user_id', user.id)  // FIXED: was 'employee_id'
      .eq('module_id', moduleId)  // FIXED: was 'course_id' with hardcoded ID
      .single()

    if (error || !enrollment) {
      console.log('❌ No enrollment found for user:', user.id, 'module:', moduleId)
      console.error('Enrollment error:', error)
      return NextResponse.json({ 
        completedLessons: [],
        xpEarned: 0,
        completionPercentage: 0
      })
    }

    console.log('✅ Enrollment found:', { enrollmentId: enrollment.id, moduleId })

    // Fetch actual completed lessons from lesson_responses table
    // CRITICAL: Only get lessons where completed = TRUE
    const { data: responses, error: responsesError } = await supabase
      .from('lesson_responses')
      .select('lesson_id')
      .eq('enrollment_id', enrollment.id)
      .eq('completed', true)  // 🔥 CRITICAL FIX: Only completed lessons!

    if (responsesError) {
      console.error('❌ Error fetching lesson responses:', responsesError)
      return NextResponse.json({
        completedLessons: [],
        xpEarned: enrollment.xp_earned || 0,
        completionPercentage: enrollment.progress_percentage || 0
      })
    }

    // Get unique lesson IDs (only completed ones)
    const completedLessons = [...new Set(responses?.map(r => r.lesson_id) || [])]

    console.log('✅ Progress loaded:', { 
      moduleId,
      enrollmentId: enrollment.id,
      completedLessons,
      completedCount: completedLessons.length,
      xpEarned: enrollment.xp_earned,
      progressPercentage: enrollment.progress_percentage
    })

    return NextResponse.json({
      completedLessons,
      xpEarned: enrollment.xp_earned || 0,
      completionPercentage: enrollment.progress_percentage || 0  // FIXED: correct column name
    })

  } catch (error) {
    console.error('Error in progress API:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

