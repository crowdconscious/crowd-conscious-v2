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

    // Get the Clean Air course enrollment
    const cleanAirCourseId = 'a1a1a1a1-1111-1111-1111-111111111111'
    
    const { data: enrollment, error } = await supabase
      .from('course_enrollments')
      .select('modules_completed, xp_earned, completion_percentage')
      .eq('employee_id', user.id)
      .eq('course_id', cleanAirCourseId)
      .single()

    if (error || !enrollment) {
      console.log('No enrollment found for user:', user.id)
      return NextResponse.json({ completedLessons: [] })
    }

    // Map modules_completed count to lesson IDs
    const lessonIds = [
      'lesson-1-marias-awakening',
      'lesson-2-the-investigation', 
      'lesson-3-the-commitment'
    ]
    
    const completedCount = enrollment.modules_completed || 0
    const completedLessons = lessonIds.slice(0, completedCount)

    console.log('Progress for', moduleId, ':', { completedCount, completedLessons })

    return NextResponse.json({
      completedLessons,
      xpEarned: enrollment.xp_earned || 0,
      completionPercentage: enrollment.completion_percentage || 0
    })

  } catch (error) {
    console.error('Error in progress API:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

