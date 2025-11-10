import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const {
      enrollment_id,
      module_id,
      lesson_id,
      activity_type,
      responses, // { question_1: "answer", question_2: ["option_a", "option_b"], etc. }
      evidence_urls, // Array of uploaded file URLs
      completion_data // Additional completion metadata
    } = body

    console.log('💾 Saving activity response:', {
      user_id: user.id,
      enrollment_id,
      module_id,
      lesson_id,
      activity_type
    })

    // Extract structured data from responses for new activity_responses table
    const preAssessment = responses?.pre_assessment || null
    const keyLearning = responses?.key_learning || responses?.reflection_0 || null
    const applicationPlan = responses?.application_plan || responses?.reflection_1 || null
    const challengesIdentified = responses?.challenges_identified || responses?.reflection_2 || null
    const stepsCompleted = Array.isArray(responses?.steps_completed) ? responses.steps_completed : []
    const confidenceLevel = responses?.confidence_level ? parseInt(responses.confidence_level) : null
    const additionalNotes = responses?.additional_notes || null
    
    // Filter out structured fields from custom_responses
    const customResponses: Record<string, any> = {}
    for (const [key, value] of Object.entries(responses || {})) {
      if (!['pre_assessment', 'key_learning', 'application_plan', 'challenges_identified', 
            'steps_completed', 'confidence_level', 'additional_notes',
            'reflection_0', 'reflection_1', 'reflection_2'].includes(key)) {
        customResponses[key] = value
      }
    }

    // Calculate completion metrics
    const totalQuestions = completion_data?.total_questions || 0
    const questionsAnswered = completion_data?.questions_answered || 0
    const completionPercentage = completion_data?.completion_percentage || 0
    const timeSpentMinutes = completion_data?.time_spent_minutes || 0
    const isCompleted = completionPercentage === 100

    // 🔥 NEW: Save to activity_responses table (structured ESG data)
    const { data: existingActivity } = await supabase
      .from('activity_responses')
      .select('id, attempt_number')
      .eq('enrollment_id', enrollment_id)
      .eq('lesson_id', lesson_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    let activityResult

    if (existingActivity) {
      // Update existing response
      const { data, error } = await (supabase as any)
        .from('activity_responses')
        .update({
          pre_assessment_level: preAssessment,
          key_learning: keyLearning,
          application_plan: applicationPlan,
          challenges_identified: challengesIdentified,
          steps_completed: stepsCompleted,
          confidence_level: confidenceLevel,
          additional_notes: additionalNotes,
          custom_responses: customResponses,
          evidence_urls: evidence_urls || [],
          completion_percentage: completionPercentage,
          questions_answered: questionsAnswered,
          total_questions: totalQuestions,
          time_spent_minutes: timeSpentMinutes,
          completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingActivity.id)
        .select()
        .single()

      if (error) {
        console.error('❌ Error updating activity response:', error)
      } else {
        activityResult = data
        console.log('✅ Activity response updated (new table):', activityResult?.id)
      }
    } else {
      // Create new response in new table
      const { data, error } = await (supabase as any)
        .from('activity_responses')
        .insert({
          user_id: user.id,
          enrollment_id,
          module_id,
          lesson_id,
          activity_type: activity_type || 'interactive_activity',
          activity_title: 'Actividad Interactiva',
          pre_assessment_level: preAssessment,
          key_learning: keyLearning,
          application_plan: applicationPlan,
          challenges_identified: challengesIdentified,
          steps_completed: stepsCompleted,
          confidence_level: confidenceLevel,
          additional_notes: additionalNotes,
          custom_responses: customResponses,
          evidence_urls: evidence_urls || [],
          completion_percentage: completionPercentage,
          questions_answered: questionsAnswered,
          total_questions: totalQuestions,
          time_spent_minutes: timeSpentMinutes,
          completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
          attempt_number: 1
        })
        .select()
        .single()

      if (error) {
        console.error('❌ Error creating activity response:', error)
      } else {
        activityResult = data
        console.log('✅ Activity response created (new table):', activityResult?.id)
      }
    }

    // 🔄 BACKWARD COMPATIBILITY: Also save to lesson_responses (legacy)
    const { data: existingLegacy } = await supabase
      .from('lesson_responses')
      .select('*')
      .eq('enrollment_id', enrollment_id)
      .eq('lesson_id', lesson_id)
      .single()

    if (existingLegacy) {
      await supabase
        .from('lesson_responses')
        .update({
          responses: {
            ...existingLegacy.responses,
            activity_responses: responses,
            completion_data: completion_data || {}
          },
          evidence_urls: [...(existingLegacy.evidence_urls || []), ...(evidence_urls || [])],
          updated_at: new Date().toISOString()
        })
        .eq('id', existingLegacy.id)
    } else {
      await supabase
        .from('lesson_responses')
        .insert({
          enrollment_id,
          module_id,
          lesson_id,
          responses: {
            activity_responses: responses,
            completion_data: completion_data || {}
          },
          evidence_urls: evidence_urls || [],
          completed: false
        })
    }

    // Update enrollment progress (optional - don't block if RPC doesn't exist)
    try {
      await supabase.rpc('update_lesson_completion', {
        p_enrollment_id: enrollment_id,
        p_lesson_id: lesson_id,
        p_completed: true
      })
      console.log('✅ Lesson progress updated via RPC')
    } catch (rpcError) {
      console.warn('⚠️ RPC function not available, skipping progress update:', rpcError)
    }

    return NextResponse.json({
      success: true,
      response_id: activityResult?.id || 'legacy',
      message: 'Respuesta guardada exitosamente',
      esg_ready: !!activityResult // Indicates if saved to new ESG table
    })

  } catch (error) {
    console.error('❌ Critical error saving activity response:', error)
    return NextResponse.json({ 
      error: 'Error del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

// GET endpoint to retrieve user's responses for a lesson
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const lesson_id = searchParams.get('lesson_id')
    const module_id = searchParams.get('module_id')

    if (!lesson_id) {
      return NextResponse.json({ error: 'lesson_id requerido' }, { status: 400 })
    }

    // Get enrollment_id first
    const { data: enrollment } = await supabase
      .from('course_enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('module_id', module_id)
      .single()

    if (!enrollment) {
      return NextResponse.json({ response: null })
    }

    // 🔥 TRY NEW TABLE FIRST: activity_responses (structured ESG data)
    const { data: newResponse, error: newError } = await supabase
      .from('activity_responses')
      .select('*')
      .eq('enrollment_id', enrollment.id)
      .eq('lesson_id', lesson_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (newResponse) {
      // Reconstruct responses object from structured data
      const reconstructedResponses = {
        pre_assessment: newResponse.pre_assessment_level,
        key_learning: newResponse.key_learning,
        application_plan: newResponse.application_plan,
        challenges_identified: newResponse.challenges_identified,
        steps_completed: newResponse.steps_completed,
        confidence_level: newResponse.confidence_level?.toString(),
        additional_notes: newResponse.additional_notes,
        ...newResponse.custom_responses // Include any custom fields
      }

      console.log('✅ Loaded from new activity_responses table')
      
      return NextResponse.json({
        response: {
          id: newResponse.id,
          responses: reconstructedResponses,
          evidence_urls: newResponse.evidence_urls,
          completion_percentage: newResponse.completion_percentage,
          completed: newResponse.completed,
          esg_ready: true
        }
      })
    }

    // 🔄 FALLBACK: Try legacy lesson_responses table
    const { data: legacyData, error: legacyError } = await supabase
      .from('lesson_responses')
      .select('*')
      .eq('enrollment_id', enrollment.id)
      .eq('lesson_id', lesson_id)
      .single()

    if (legacyError && legacyError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('❌ Error fetching activity response:', legacyError)
      return NextResponse.json({ 
        error: 'Error al recuperar respuesta',
        details: legacyError.message 
      }, { status: 500 })
    }

    if (legacyData) {
      // Extract activity responses from the responses JSONB field
      const activityResponses = legacyData?.responses?.activity_responses || {}
      
      console.log('⚠️ Loaded from legacy lesson_responses table')

      return NextResponse.json({
        response: { 
          ...legacyData,
          responses: activityResponses, // Return just the activity responses part
          esg_ready: false
        }
      })
    }

    // No data found in either table
    return NextResponse.json({ response: null })

  } catch (error) {
    console.error('❌ Critical error fetching activity response:', error)
    return NextResponse.json({ 
      error: 'Error del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

