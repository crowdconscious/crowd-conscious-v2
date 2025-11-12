import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { validateLessonResponse, getQualityControlMessage } from '@/lib/quality-control-validation'
import { ApiResponse } from '@/lib/api-responses'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return ApiResponse.unauthorized('Please log in to complete lessons')
    }

    const body = await req.json()
    const { moduleId, lessonId, xpEarned, responses, reflection, actionItems, timeSpent, evidence, quizAnswers, quizQuestions, activityType, activityData } = body

    console.log('Complete lesson request:', { 
      userId: user.id, 
      moduleId, 
      lessonId, 
      xpEarned, 
      hasResponses: !!responses,
      hasActivityData: !!activityData,
      hasReflection: !!reflection,
      hasActionItems: !!actionItems,
      responsesKeys: responses ? Object.keys(responses) : []
    })

    // 🔒 QUALITY CONTROL: Validate response quality before marking complete
    // ✅ PHASE 4 FIX: Extract activityData from responses if it's nested there
    const actualActivityData = activityData || responses?.activityData || responses
    
    const validation = validateLessonResponse({
      responses: responses || {},
      reflection: reflection || responses?.reflection,
      actionItems: actionItems || responses?.actionItems,
      evidence: evidence || responses?.evidence || responses?.uploadedFiles,
      quizAnswers: quizAnswers || responses?.quizAnswers,
      quizQuestions: quizQuestions || responses?.quizQuestions,
      activityType: activityType || responses?.activityType || 'general',
      activityData: actualActivityData
    })

    if (!validation.isValid) {
      console.warn('❌ Quality control failed:', validation.errors)
      return ApiResponse.badRequest(
        getQualityControlMessage(validation),
        'QUALITY_CONTROL_FAILED',
        {
          validation: {
            errors: validation.errors,
            warnings: validation.warnings,
            score: validation.score,
            minimumRequired: 70
          }
        }
      )
    }

    console.log('✅ Quality control passed:', { score: validation.score })

    // Get enrollment using actual column names (user_id, module_id)
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('course_enrollments')
      .select('*')
      .eq('user_id', user.id)  // FIXED: was 'employee_id'
      .eq('module_id', moduleId)  // FIXED: use actual moduleId from request
      .single()

    if (enrollmentError || !enrollment) {
      console.error('Enrollment not found:', { enrollmentError, userId: user.id, moduleId })
      return ApiResponse.notFound('Enrollment', 'ENROLLMENT_NOT_FOUND')
    }

    console.log('✅ Enrollment found:', { enrollmentId: enrollment.id, moduleId })

    // 🔥 FIX: Get actual lesson count from the module (not hardcoded!)
    const { data: moduleData } = await supabase
      .from('marketplace_modules')
      .select('lesson_count')
      .eq('id', moduleId)
      .single()
    
    const totalLessons = moduleData?.lesson_count || 5  // Use actual count, fallback to 5
    console.log('📚 Module has', totalLessons, 'lessons')

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
    // 🔥 FIX: Dynamic calculation based on actual lesson count
    const newPercentage = Math.round((currentCompleted / totalLessons) * 100)
    const moduleComplete = currentCompleted >= totalLessons
    
    // Only award XP if this is a new completion
    const currentXP = enrollment.xp_earned || 0
    const xpToAward = xpEarned || 50
    const newXP = isNewCompletion ? currentXP + xpToAward : currentXP

    // Update enrollment progress
    console.log('🔄 Updating enrollment:', {
      enrollment_id: enrollment.id,
      user_id: user.id,
      module_id: moduleId,
      lesson_id: lessonId,
      is_new_completion: isNewCompletion,
      current_xp: currentXP,
      xp_to_award: xpToAward,
      new_xp_total: newXP,
      unique_lessons_completed: currentCompleted,
      total_lessons: totalLessons,
      progress_percentage: newPercentage,
      completed: moduleComplete
    })

    // ✅ PHASE 3: Use standardized field names
    const { data: updateData, error: updateError } = await supabase
      .from('course_enrollments')
      .update({
        progress_percentage: newPercentage,
        xp_earned: newXP,
        completed: moduleComplete,
        completed_at: moduleComplete ? new Date().toISOString() : null,  // ✅ Use completed_at (standardized)
        // Keep completion_date for backward compatibility (trigger will sync)
        completion_date: moduleComplete ? new Date().toISOString() : null,
        last_accessed_at: new Date().toISOString()
      })
      .eq('id', enrollment.id)
      .select()

    if (updateError) {
      console.error('❌ Error updating enrollment:', updateError)
      return ApiResponse.serverError('Failed to update progress', 'ENROLLMENT_UPDATE_FAILED', updateError)
    }

    console.log('✅ Update successful:', updateData)

    // ✅ ENHANCED: Store ALL activity data for impact reports
    console.log('💾 Saving activity data:', { 
      hasResponses: !!responses,
      hasReflection: !!reflection,
      hasActionItems: !!actionItems,
      timeSpent 
    })

    try {
      // 🎯 MINIMAL REQUIRED FIELDS - lesson can be completed without responses!
      const responseData: any = {
        enrollment_id: enrollment.id,
        lesson_id: lessonId,
        completed: true,
        completed_at: new Date().toISOString(),
        time_spent_minutes: timeSpent || 0
      }
      
      // Only add module_id if it's a valid UUID
      if (moduleId && moduleId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        responseData.module_id = moduleId
      }

      // Store ALL activity data for impact reports
      if (responses) {
        // General responses (quiz answers, reflection prompts, etc.)
        responseData.responses = responses
        
        // Carbon calculator data
        if (responses.carbonFootprint) {
          responseData.carbon_data = responses.carbonFootprint
        }
        
        // Cost/ROI calculator data
        if (responses.costAnalysis) {
          responseData.cost_data = responses.costAnalysis
        }
        
        // Impact comparison data
        if (responses.impactComparison) {
          responseData.impact_comparisons = responses.impactComparison
        }
        
        // Quiz score (if quiz exists)
        if (responses.score !== undefined) {
          responseData.quiz_score = responses.score
        }

        // Air quality assessment data
        if (responses.hasMonitoring || responses.pm25Level) {
          responseData.responses = {
            ...responseData.responses,
            airQualityAssessment: {
              hasMonitoring: responses.hasMonitoring,
              pm25Level: responses.pm25Level,
              assessedAt: new Date().toISOString()
            }
          }
        }
      }

      // Reflection data
      if (reflection) {
        responseData.reflection = typeof reflection === 'string' 
          ? reflection 
          : JSON.stringify(reflection)
      }

      // Action items/commitments
      if (actionItems && Array.isArray(actionItems)) {
        responseData.action_items = actionItems
      }

      // Evidence URLs (photos uploaded during activity)
      if (responses?.evidence || responses?.uploadedFiles) {
        responseData.evidence_urls = responses.evidence || responses.uploadedFiles || []
      }

      console.log('💾 About to upsert lesson response')
      console.log('💾 Keys:', Object.keys(responseData))
      console.log('💾 enrollment_id:', responseData.enrollment_id)
      console.log('💾 lesson_id:', responseData.lesson_id)
      console.log('💾 completed:', responseData.completed)
      console.log('💾 module_id:', responseData.module_id)

      const { data: upsertedData, error: responseError } = await supabase
        .from('lesson_responses')
        .upsert(responseData, {
          onConflict: 'enrollment_id,lesson_id'
        })
        .select()

      if (responseError) {
        console.error('❌ CRITICAL ERROR storing lesson responses!')
        console.error('❌ Error code:', responseError.code)
        console.error('❌ Error message:', responseError.message)
        console.error('❌ Error details:', responseError.details)
        console.error('❌ Error hint:', responseError.hint)
        console.error('❌ Data that failed:', {
          enrollment_id: responseData.enrollment_id,
          lesson_id: responseData.lesson_id,
          module_id: responseData.module_id,
          completed: responseData.completed
        })
        
        // 🔥 Return detailed error to frontend
        return ApiResponse.serverError(
          'Failed to save lesson completion',
          'LESSON_RESPONSE_SAVE_FAILED',
          {
            code: responseError.code,
            message: responseError.message,
            details: responseError.details,
            hint: responseError.hint,
            debugData: {
              enrollment_id: responseData.enrollment_id,
              lesson_id: responseData.lesson_id,
              hasModuleId: !!responseData.module_id
            }
          }
        )
      } else {
        console.log('✅ Lesson responses stored successfully!')
        console.log('✅ Inserted/Updated rows:', upsertedData)
      }
    } catch (responseStoreError: any) {
      console.error('❌ CRITICAL: Exception storing responses:', responseStoreError)
      return ApiResponse.serverError(
        'Exception saving lesson',
        'LESSON_SAVE_EXCEPTION',
        { message: responseStoreError.message }
      )
    }

    console.log('✅ Lesson completed:', { 
      isNewCompletion, 
      uniqueLessonsCompleted: currentCompleted, 
      newPercentage, 
      newXP, 
      moduleComplete 
    })

    return ApiResponse.ok({
      isNewCompletion,
      xpEarned: isNewCompletion ? (xpEarned || 250) : 0,
      newXP,
      moduleComplete,
      completedLessons: currentCompleted,
      completionPercentage: newPercentage
    })

  } catch (error: any) {
    console.error('Error completing lesson:', error)
    return ApiResponse.serverError('Server error while completing lesson', 'LESSON_COMPLETION_ERROR', error)
  }
}

