import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/**
 * Save tool results to activity_responses.custom_responses
 * This stores data from module-specific tools (calculators, assessments, etc.)
 * for ESG reporting and analytics
 */
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
        return NextResponse.json({ 
          error: 'Error al actualizar resultado',
          details: error.message 
        }, { status: 500 })
      }

      console.log('✅ Tool result updated in activity_responses:', existingResponse.id)

      return NextResponse.json({
        success: true,
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
        return NextResponse.json({ 
          error: 'Error al guardar resultado',
          details: error.message 
        }, { status: 500 })
      }

      console.log('✅ Tool result created in activity_responses:', data.id)

      return NextResponse.json({
        success: true,
        response_id: data.id,
        message: 'Resultado guardado exitosamente',
        action: 'created'
      })
    }

  } catch (error) {
    console.error('❌ Critical error saving tool result:', error)
    return NextResponse.json({ 
      error: 'Error del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
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
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const lesson_id = searchParams.get('lesson_id')
    const module_id = searchParams.get('module_id')
    const tool_name = searchParams.get('tool_name')

    if (!lesson_id || !module_id) {
      return NextResponse.json({ 
        error: 'lesson_id and module_id required' 
      }, { status: 400 })
    }

    // Get enrollment_id
    const { data: enrollment } = await supabase
      .from('course_enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('module_id', module_id)
      .single()

    if (!enrollment) {
      return NextResponse.json({ tool_data: null })
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
      return NextResponse.json({ tool_data: null })
    }

    // Extract specific tool data if tool_name provided
    if (tool_name) {
      const toolData = response.custom_responses?.[`tool_${tool_name}`]
      return NextResponse.json({ 
        tool_data: toolData || null,
        tool_name
      })
    }

    // Return all tool data
    return NextResponse.json({ 
      tool_data: response.custom_responses || {},
      all_tools: true
    })

  } catch (error) {
    console.error('❌ Error fetching tool results:', error)
    return NextResponse.json({ 
      error: 'Error del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

