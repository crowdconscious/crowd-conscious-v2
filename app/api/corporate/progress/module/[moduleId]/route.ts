import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { ApiResponse } from '@/lib/api-responses'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  try {
    const { moduleId } = await params
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return ApiResponse.unauthorized('Please log in to view progress')
    }

    // ✅ FIXED: Use JOIN instead of separate queries
    const { data: enrollment, error } = await supabase
      .from('course_enrollments')
      .select(`
        id,
        xp_earned,
        progress_percentage,
        lesson_responses(
          lesson_id,
          completed
        )
      `)
      .eq('user_id', user.id)
      .eq('module_id', moduleId)
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

    // Extract completed lesson IDs from joined data (filter for completed = true)
    const allResponses = (enrollment as any).lesson_responses || []
    const completedResponses = allResponses.filter((r: any) => r.completed === true)
    const completedLessons = [...new Set(completedResponses.map((r: any) => r.lesson_id))]

    console.log('✅ Progress loaded:', { 
      moduleId,
      enrollmentId: enrollment.id,
      completedLessons,
      completedCount: completedLessons.length,
      xpEarned: enrollment.xp_earned,
      progressPercentage: enrollment.progress_percentage
    })

    return ApiResponse.ok({
      completedLessons,
      xpEarned: enrollment.xp_earned || 0,
      completionPercentage: enrollment.progress_percentage || 0
    })

  } catch (error: any) {
    console.error('Error in progress API:', error)
    return ApiResponse.serverError('Failed to fetch progress', 'PROGRESS_FETCH_ERROR', { message: error.message })
  }
}

