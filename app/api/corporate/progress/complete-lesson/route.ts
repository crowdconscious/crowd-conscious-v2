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

    // Get enrollment using actual column names (user_id, module_id)
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('course_enrollments')
      .select('*')
      .eq('user_id', user.id)  // FIXED: was 'employee_id'
      .eq('module_id', moduleId)  // FIXED: use actual moduleId from request
      .single()

    if (enrollmentError || !enrollment) {
      console.error('Enrollment not found:', { enrollmentError, userId: user.id, moduleId })
      return NextResponse.json({ 
        error: 'Enrollment not found',
        details: 'Please ensure you are enrolled in this module',
        debug: { userId: user.id, moduleId }
      }, { status: 404 })
    }

    console.log('✅ Enrollment found:', { enrollmentId: enrollment.id, moduleId })

    // Track completed lessons - check if already completed this specific lesson
    const { data: existingResponse } = await supabase
      .from('lesson_responses')
      .select('id')
      .eq('enrollment_id', enrollment.id)  // FIXED: use enrollment_id
      .eq('lesson_id', lessonId)
      .single()

    const isNewCompletion = !existingResponse
    
    // Get all unique completed lessons for this enrollment
    const { data: allCompletedLessons } = await supabase
      .from('lesson_responses')
      .select('lesson_id')
      .eq('enrollment_id', enrollment.id)  // FIXED: use enrollment_id
    
    const uniqueLessons = new Set(allCompletedLessons?.map(r => r.lesson_id) || [])
    if (isNewCompletion) {
      uniqueLessons.add(lessonId) // Add current lesson if it's new
    }
    
    const currentCompleted = uniqueLessons.size
    const totalLessons = 5  // FIXED: Aire Limpio has 5 lessons
    const newPercentage = Math.round((currentCompleted / totalLessons) * 100)
    const moduleComplete = currentCompleted >= totalLessons
    
    // Only award XP if this is a new completion
    const currentXP = enrollment.xp_earned || 0
    const newXP = isNewCompletion ? currentXP + (xpEarned || 50) : currentXP

    // Update enrollment progress
    console.log('🔄 Updating enrollment:', {
      enrollment_id: enrollment.id,
      user_id: user.id,
      module_id: moduleId,
      lesson_id: lessonId,
      is_new_completion: isNewCompletion,
      unique_lessons_completed: currentCompleted,
      progress_percentage: newPercentage,
      xp_earned: newXP,
      completed: moduleComplete
    })

    const { data: updateData, error: updateError } = await supabase
      .from('course_enrollments')
      .update({
        progress_percentage: newPercentage,  // FIXED: use correct column name
        completed: moduleComplete,  // FIXED: use boolean 'completed' field
        completion_date: moduleComplete ? new Date().toISOString() : null
      })
      .eq('id', enrollment.id)  // FIXED: update by enrollment ID
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
            enrollment_id: enrollment.id,  // FIXED: use enrollment_id
            lesson_id: lessonId,
            quiz_score: responses.score || null,  // FIXED: match actual schema
            evidence_urls: responses.evidence || [],  // FIXED: match actual schema
            completed: true,
            completed_at: new Date().toISOString()
          }, {
            onConflict: 'enrollment_id,lesson_id'  // FIXED: correct unique constraint
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

