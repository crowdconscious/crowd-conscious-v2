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
      .select('xp_earned, completion_percentage')
      .eq('employee_id', user.id)
      .eq('course_id', cleanAirCourseId)
      .single()

    if (error || !enrollment) {
      console.log('No enrollment found for user:', user.id)
      return NextResponse.json({ 
        completedLessons: [],
        xpEarned: 0,
        completionPercentage: 0
      })
    }

    // Fetch actual completed lessons from lesson_responses table
    const { data: responses, error: responsesError } = await supabase
      .from('lesson_responses')
      .select('lesson_id')
      .eq('employee_id', user.id)
      .eq('course_id', cleanAirCourseId)
      .eq('module_id', moduleId)

    if (responsesError) {
      console.error('Error fetching lesson responses:', responsesError)
      return NextResponse.json({
        completedLessons: [],
        xpEarned: enrollment.xp_earned || 0,
        completionPercentage: enrollment.completion_percentage || 0
      })
    }

    // Get unique lesson IDs
    const completedLessons = [...new Set(responses?.map(r => r.lesson_id) || [])]

    console.log('✅ Progress for', moduleId, ':', { 
      completedLessons,
      xpEarned: enrollment.xp_earned,
      completionPercentage: enrollment.completion_percentage
    })

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

