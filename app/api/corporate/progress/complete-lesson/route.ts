import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { moduleId, lessonId, xpEarned, responses, reflection, actionItems, timeSpent } = body

    console.log('Complete lesson request:', { userId: user.id, moduleId, lessonId, xpEarned, hasResponses: !!responses })

    // Get the Clean Air course ID
    const cleanAirCourseId = 'a1a1a1a1-1111-1111-1111-111111111111'

    // Get enrollment
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('course_enrollments')
      .select('*')
      .eq('employee_id', user.id)
      .eq('course_id', cleanAirCourseId)
      .single()

    if (enrollmentError || !enrollment) {
      console.error('Enrollment not found:', enrollmentError)
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })
    }

    // Track completed lessons (simplified - just count)
    const currentCompleted = enrollment.modules_completed || 0
    const newCompleted = currentCompleted + 1
    const totalLessons = 3
    const newPercentage = Math.round((newCompleted / totalLessons) * 100)
    const moduleComplete = newCompleted >= totalLessons
    const currentXP = enrollment.xp_earned || 0
    const newXP = currentXP + (xpEarned || 250)

    // Update enrollment (without last_accessed_at which doesn't exist)
    console.log('🔄 Updating enrollment:', {
      employee_id: user.id,
      course_id: cleanAirCourseId,
      modules_completed: newCompleted,
      completion_percentage: newPercentage,
      xp_earned: newXP,
      status: moduleComplete ? 'completed' : 'in_progress'
    })

    const { data: updateData, error: updateError } = await supabase
      .from('course_enrollments')
      .update({
        modules_completed: newCompleted,
        completion_percentage: newPercentage,
        xp_earned: newXP,
        status: moduleComplete ? 'completed' : 'in_progress',
        completed_at: moduleComplete ? new Date().toISOString() : null
      })
      .eq('employee_id', user.id)
      .eq('course_id', cleanAirCourseId)
      .select()

    if (updateError) {
      console.error('❌ Error updating enrollment:', updateError)
      return NextResponse.json({ error: 'Failed to update progress', details: updateError }, { status: 500 })
    }

    console.log('✅ Update successful:', updateData)

    // Store lesson responses if provided
    if (responses) {
      try {
        const { error: responseError } = await supabase
          .from('lesson_responses')
          .upsert({
            employee_id: user.id,
            corporate_account_id: enrollment.corporate_account_id,
            course_id: cleanAirCourseId,
            module_id: moduleId,
            lesson_id: lessonId,
            responses: responses,
            reflection: reflection || null,
            action_items: actionItems || null,
            time_spent_minutes: timeSpent || null,
            completed_at: new Date().toISOString()
          }, {
            onConflict: 'employee_id,course_id,module_id,lesson_id'
          })

        if (responseError) {
          console.error('Error storing lesson responses:', responseError)
          // Don't fail the request if response storage fails
        } else {
          console.log('✅ Lesson responses stored')
        }
      } catch (responseStoreError) {
        console.error('Error storing responses:', responseStoreError)
        // Continue even if response storage fails
      }
    }

    console.log('✅ Lesson completed:', { newCompleted, newPercentage, newXP, moduleComplete })

    return NextResponse.json({
      success: true,
      xpEarned: xpEarned || 250,
      newXP,
      moduleComplete,
      completedLessons: newCompleted,
      completionPercentage: newPercentage
    })

  } catch (error) {
    console.error('Error completing lesson:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

