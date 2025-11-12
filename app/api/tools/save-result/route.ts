import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { ApiResponse } from '@/lib/api-responses'

export const dynamic = 'force-dynamic'

/**
 * ⚠️ DEPRECATED: This endpoint is deprecated. Use /api/enrollments/[enrollmentId]/activities instead.
 * This endpoint will be removed in a future version.
 * 
 * Save tool results to activity_responses.custom_responses
 * This stores data from module-specific tools (calculators, assessments, etc.)
 * for ESG reporting and analytics
 */
export async function POST(request: NextRequest) {
  console.warn('⚠️ DEPRECATED ENDPOINT: /api/tools/save-result is deprecated. Use /api/enrollments/[enrollmentId]/activities instead.')
  
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return ApiResponse.unauthorized('Please log in to save tool results', 'AUTHENTICATION_REQUIRED')
    }

    const body = await request.json()
    const {
      enrollment_id,
      module_id,
      lesson_id,
      tool_name, // e.g., 'air-quality-assessment', 'water-footprint-calculator'
      tool_data, // The result object from the tool
      tool_type, // e.g., 'assessment', 'calculator', 'planner'
    } = body

    console.log('💾 Saving tool result:', {
      user_id: user.id,
      enrollment_id,
      tool_name,
      tool_type
    })

    // Check if there's an existing activity_response for this lesson
    const { data: existingResponse } = await supabase
      .from('activity_responses')
      .select('id, custom_responses')
      .eq('enrollment_id', enrollment_id)
      .eq('lesson_id', lesson_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (existingResponse) {
      // Update existing response - merge tool data into custom_responses
      const updatedCustomResponses = {
        ...(existingResponse.custom_responses || {}),
        [`tool_${tool_name}`]: {
          ...tool_data,
          tool_type,
          saved_at: new Date().toISOString()
        }
      }

      const { data, error } = await (supabase as any)
        .from('activity_responses')
        .update({
          custom_responses: updatedCustomResponses,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingResponse.id)
        .select()
        .single()

      if (error) {
        console.error('❌ Error updating tool result:', error)
        return ApiResponse.serverError('Error al actualizar resultado', 'TOOL_RESULT_UPDATE_ERROR', { message: error.message })
      }

      console.log('✅ Tool result updated in activity_responses:', existingResponse.id)

      return ApiResponse.ok({
        response_id: existingResponse.id,
        message: 'Resultado guardado exitosamente',
        action: 'updated'
      })
    } else {
      // Create new activity_response with tool data
      const customResponses = {
        [`tool_${tool_name}`]: {
          ...tool_data,
          tool_type,
          saved_at: new Date().toISOString()
        }
      }

      const { data, error } = await (supabase as any)
        .from('activity_responses')
        .insert({
          user_id: user.id,
          enrollment_id,
          module_id,
          lesson_id,
          activity_type: 'tool_usage',
          activity_title: `Tool: ${tool_name}`,
          custom_responses: customResponses,
          completion_percentage: 0,
          questions_answered: 0,
          total_questions: 0,
          attempt_number: 1
        })
        .select()
        .single()

      if (error) {
        console.error('❌ Error creating tool result:', error)
        return ApiResponse.serverError('Error al guardar resultado', 'TOOL_RESULT_CREATION_ERROR', { message: error.message })
      }

      console.log('✅ Tool result created in activity_responses:', data.id)

      return ApiResponse.ok({
        response_id: data.id,
        message: 'Resultado guardado exitosamente',
        action: 'created'
      })
    }

  } catch (error: any) {
    console.error('❌ Critical error saving tool result:', error)
    return ApiResponse.serverError('Error del servidor', 'TOOL_RESULT_SERVER_ERROR', { message: error.message })
  }
}

/**
 * GET: Retrieve saved tool results for a lesson
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return ApiResponse.unauthorized('Please log in to retrieve tool results', 'AUTHENTICATION_REQUIRED')
    }

    const { searchParams } = new URL(request.url)
    const lesson_id = searchParams.get('lesson_id')
    const module_id = searchParams.get('module_id')
    const tool_name = searchParams.get('tool_name')

    if (!lesson_id || !module_id) {
      return ApiResponse.badRequest('lesson_id and module_id required', 'MISSING_REQUIRED_PARAMS')
    }

    // Get enrollment_id
    const { data: enrollment } = await supabase
      .from('course_enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('module_id', module_id)
      .single()

    if (!enrollment) {
      return ApiResponse.ok({ tool_data: null })
    }

    // Get activity_response with tool data
    const { data: response } = await supabase
      .from('activity_responses')
      .select('custom_responses')
      .eq('enrollment_id', enrollment.id)
      .eq('lesson_id', lesson_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!response) {
      return ApiResponse.ok({ tool_data: null })
    }

    // Extract specific tool data if tool_name provided
    if (tool_name) {
      const toolData = response.custom_responses?.[`tool_${tool_name}`]
      return ApiResponse.ok({ 
        tool_data: toolData || null,
        tool_name
      })
    }

    // Return all tool data
    return ApiResponse.ok({ 
      tool_data: response.custom_responses || {},
      all_tools: true
    })

  } catch (error: any) {
    console.error('❌ Error fetching tool results:', error)
    return ApiResponse.serverError('Error del servidor', 'TOOL_RESULT_FETCH_ERROR', { message: error.message })
  }
}

