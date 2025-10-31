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

    // Track completed lessons - check if already completed this specific lesson
    const { data: existingResponse } = await supabase
      .from('lesson_responses')
      .select('id')
      .eq('employee_id', user.id)
      .eq('course_id', cleanAirCourseId)
      .eq('module_id', moduleId)
      .eq('lesson_id', lessonId)
      .single()

    const isNewCompletion = !existingResponse
    
    // Get all unique completed lessons for this course
    const { data: allCompletedLessons } = await supabase
      .from('lesson_responses')
      .select('lesson_id')
      .eq('employee_id', user.id)
      .eq('course_id', cleanAirCourseId)
    
    const uniqueLessons = new Set(allCompletedLessons?.map(r => r.lesson_id) || [])
    if (isNewCompletion) {
      uniqueLessons.add(lessonId) // Add current lesson if it's new
    }
    
    const currentCompleted = uniqueLessons.size
    const totalLessons = 3
    const newPercentage = Math.round((currentCompleted / totalLessons) * 100)
    const moduleComplete = currentCompleted >= totalLessons
    
    // Only award XP if this is a new completion
    const currentXP = enrollment.xp_earned || 0
    const newXP = isNewCompletion ? currentXP + (xpEarned || 250) : currentXP

    // Update enrollment (without last_accessed_at which doesn't exist)
    console.log('🔄 Updating enrollment:', {
      employee_id: user.id,
      course_id: cleanAirCourseId,
      lesson_id: lessonId,
      is_new_completion: isNewCompletion,
      unique_lessons_completed: currentCompleted,
      completion_percentage: newPercentage,
      xp_earned: newXP,
      status: moduleComplete ? 'completed' : 'in_progress'
    })

    const { data: updateData, error: updateError } = await supabase
      .from('course_enrollments')
      .update({
        modules_completed: currentCompleted,
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

    console.log('✅ Lesson completed:', { 
      isNewCompletion, 
      uniqueLessonsCompleted: currentCompleted, 
      newPercentage, 
      newXP, 
      moduleComplete 
    })

    return NextResponse.json({
      success: true,
      isNewCompletion,
      xpEarned: isNewCompletion ? (xpEarned || 250) : 0,
      newXP,
      moduleComplete,
      completedLessons: currentCompleted,
      completionPercentage: newPercentage
    })

  } catch (error) {
    console.error('Error completing lesson:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

