import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/**
 * ✅ PHASE 2: Unified Activity Saving Endpoint
 * 
 * Consolidates three endpoints into one:
 * - /api/activities/save-response (interactive activities)
 * - /api/corporate/progress/save-activity (tool data)
 * - /api/tools/save-result (tool results)
 * 
 * Single source of truth: activity_responses table
 * Backward compatibility: Optionally writes to lesson_responses (deprecated)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ enrollmentId: string }> }
) {
  try {
    const supabase = await createClient()
    const { enrollmentId } = await params
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const {
      module_id,
      lesson_id,
      activity_type, // 'interactive_activity', 'tool_usage', 'reflection', 'carbon', 'cost', etc.
      activity_data, // The actual data (responses, tool results, etc.)
      evidence_urls = [],
      completion_data = {},
      // Legacy compatibility fields
      responses, // For backward compatibility with old format
      tool_name, // For tool-specific saves
      tool_type, // 'assessment', 'calculator', 'planner'
      // Options
      write_to_legacy = false // Set to true to maintain dual-write (deprecated)
    } = body

    console.log('💾 Unified activity save:', {
      user_id: user.id,
      enrollment_id: enrollmentId,
      module_id,
      lesson_id,
      activity_type
    })

    // Validate required fields
    if (!module_id || !lesson_id || !activity_type) {
      return NextResponse.json({ 
        error: 'Faltan campos requeridos: module_id, lesson_id, activity_type' 
      }, { status: 400 })
    }

    // Normalize activity data based on activity_type
    let normalizedData: any = {}
    let customResponses: Record<string, any> = {}
    let structuredFields: any = {}

    if (activity_type === 'interactive_activity' || activity_type === 'reflection') {
      // Handle interactive activity responses
      const data = activity_data || responses || {}
      
      // Extract structured fields
      structuredFields = {
        pre_assessment_level: data.pre_assessment || data.pre_assessment_level || null,
        key_learning: data.key_learning || data.reflection_0 || null,
        application_plan: data.application_plan || data.reflection_1 || null,
        challenges_identified: data.challenges_identified || data.reflection_2 || null,
        steps_completed: Array.isArray(data.steps_completed) ? data.steps_completed : [],
        confidence_level: data.confidence_level ? parseInt(data.confidence_level) : null,
        additional_notes: data.additional_notes || null
      }

      // Filter out structured fields from custom_responses
      for (const [key, value] of Object.entries(data)) {
        if (!['pre_assessment', 'key_learning', 'application_plan', 'challenges_identified', 
              'steps_completed', 'confidence_level', 'additional_notes',
              'reflection_0', 'reflection_1', 'reflection_2',
              'pre_assessment_level'].includes(key)) {
          customResponses[key] = value
        }
      }
    } else if (activity_type === 'tool_usage' || tool_name) {
      // Handle tool results
      const toolData = activity_data || {}
      const toolKey = tool_name ? `tool_${tool_name}` : `tool_${activity_type}`
      
      customResponses[toolKey] = {
        ...toolData,
        tool_type: tool_type || 'calculator',
        saved_at: new Date().toISOString()
      }
    } else {
      // Generic activity data
      customResponses[activity_type] = activity_data || {}
    }

    // Calculate completion metrics
    const totalQuestions = completion_data?.total_questions || 0
    const questionsAnswered = completion_data?.questions_answered || 0
    const completionPercentage = completion_data?.completion_percentage || 0
    const timeSpentMinutes = completion_data?.time_spent_minutes || 0
    const isCompleted = completionPercentage === 100

    // Check if there's an existing activity_response for this lesson
    const { data: existingActivity } = await supabase
      .from('activity_responses')
      .select('id, custom_responses, attempt_number, evidence_urls, completion_percentage, questions_answered, total_questions, time_spent_minutes, completed, completed_at')
      .eq('enrollment_id', enrollmentId)
      .eq('lesson_id', lesson_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    let activityResult

    if (existingActivity) {
      // Update existing response - merge custom_responses
      const updatedCustomResponses = {
        ...(existingActivity.custom_responses || {}),
        ...customResponses
      }

      const { data, error } = await (supabase as any)
        .from('activity_responses')
        .update({
          ...structuredFields,
          custom_responses: updatedCustomResponses,
          evidence_urls: evidence_urls.length > 0 
            ? [...(existingActivity.evidence_urls || []), ...evidence_urls]
            : existingActivity.evidence_urls,
          completion_percentage: completionPercentage || existingActivity.completion_percentage,
          questions_answered: questionsAnswered || existingActivity.questions_answered,
          total_questions: totalQuestions || existingActivity.total_questions,
          time_spent_minutes: timeSpentMinutes || existingActivity.time_spent_minutes,
          completed: isCompleted || existingActivity.completed,
          completed_at: isCompleted ? new Date().toISOString() : existingActivity.completed_at,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingActivity.id)
        .select()
        .single()

      if (error) {
        console.error('❌ Error updating activity response:', error)
        return NextResponse.json({ 
          error: 'Error al actualizar respuesta',
          details: error.message 
        }, { status: 500 })
      }

      activityResult = data
      console.log('✅ Activity response updated:', activityResult?.id)
    } else {
      // Create new response
      const { data, error } = await (supabase as any)
        .from('activity_responses')
        .insert({
          user_id: user.id,
          enrollment_id: enrollmentId,
          module_id,
          lesson_id,
          activity_type: activity_type || 'interactive_activity',
          activity_title: activity_type === 'tool_usage' && tool_name 
            ? `Tool: ${tool_name}` 
            : 'Actividad Interactiva',
          ...structuredFields,
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
        return NextResponse.json({ 
          error: 'Error al guardar respuesta',
          details: error.message 
        }, { status: 500 })
      }

      activityResult = data
      console.log('✅ Activity response created:', activityResult?.id)
    }

    // 🔄 OPTIONAL: Write to legacy lesson_responses table (deprecated, for backward compatibility)
    if (write_to_legacy) {
      try {
        const { data: existingLegacy } = await supabase
          .from('lesson_responses')
          .select('*')
          .eq('enrollment_id', enrollmentId)
          .eq('lesson_id', lesson_id)
          .single()

        const legacyData = {
          enrollment_id: enrollmentId,
          module_id,
          lesson_id,
          responses: {
            activity_responses: activity_data || responses || customResponses,
            completion_data: completion_data || {}
          },
          evidence_urls: evidence_urls || [],
          updated_at: new Date().toISOString()
        }

        if (existingLegacy) {
          await supabase
            .from('lesson_responses')
            .update({
              ...legacyData,
              responses: {
                ...existingLegacy.responses,
                ...legacyData.responses
              },
              evidence_urls: [...(existingLegacy.evidence_urls || []), ...(evidence_urls || [])]
            })
            .eq('id', existingLegacy.id)
        } else {
          await supabase
            .from('lesson_responses')
            .insert({
              ...legacyData,
              completed: false
            })
        }
        console.log('⚠️ Legacy write completed (deprecated)')
      } catch (legacyError) {
        console.warn('⚠️ Legacy write failed (non-critical):', legacyError)
        // Don't fail the request if legacy write fails
      }
    }

    // Update enrollment progress (optional - don't block if RPC doesn't exist)
    try {
      await supabase.rpc('update_lesson_completion', {
        p_enrollment_id: enrollmentId,
        p_lesson_id: lesson_id,
        p_completed: isCompleted
      })
      console.log('✅ Lesson progress updated via RPC')
    } catch (rpcError) {
      console.warn('⚠️ RPC function not available, skipping progress update:', rpcError)
    }

    return NextResponse.json({
      success: true,
      response_id: activityResult?.id,
      message: 'Respuesta guardada exitosamente',
      esg_ready: true // Always true - we're using the new table
    })

  } catch (error) {
    console.error('❌ Critical error saving activity:', error)
    return NextResponse.json({ 
      error: 'Error del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

/**
 * GET: Retrieve saved activity responses for a lesson
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ enrollmentId: string }> }
) {
  try {
    const supabase = await createClient()
    const { enrollmentId } = await params
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const lesson_id = searchParams.get('lesson_id')
    const tool_name = searchParams.get('tool_name')

    if (!lesson_id) {
      return NextResponse.json({ error: 'lesson_id requerido' }, { status: 400 })
    }

    // Get activity_response from new table
    const { data: response } = await supabase
      .from('activity_responses')
      .select('*')
      .eq('enrollment_id', enrollmentId)
      .eq('lesson_id', lesson_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!response) {
      return NextResponse.json({ response: null })
    }

    // Reconstruct responses object from structured data
    const reconstructedResponses = {
      pre_assessment: response.pre_assessment_level,
      key_learning: response.key_learning,
      application_plan: response.application_plan,
      challenges_identified: response.challenges_identified,
      steps_completed: response.steps_completed,
      confidence_level: response.confidence_level?.toString(),
      additional_notes: response.additional_notes,
      ...response.custom_responses // Include any custom fields
    }

    // If tool_name specified, return just that tool's data
    if (tool_name) {
      const toolData = response.custom_responses?.[`tool_${tool_name}`]
      return NextResponse.json({
        tool_data: toolData || null,
        tool_name
      })
    }

    console.log('✅ Loaded from activity_responses table')
    
    return NextResponse.json({
      response: {
        id: response.id,
        responses: reconstructedResponses,
        evidence_urls: response.evidence_urls,
        completion_percentage: response.completion_percentage,
        completed: response.completed,
        esg_ready: true
      }
    })

  } catch (error) {
    console.error('❌ Critical error fetching activity:', error)
    return NextResponse.json({ 
      error: 'Error del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

