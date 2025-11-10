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

    // Use EXISTING lesson_responses table (consolidate with existing infrastructure)
    const { data: existingResponse } = await supabase
      .from('lesson_responses')
      .select('*')
      .eq('enrollment_id', enrollment_id)
      .eq('lesson_id', lesson_id)
      .single()

    let result

    if (existingResponse) {
      // Update existing response - merge with existing data
      const { data, error } = await supabase
        .from('lesson_responses')
        .update({
          responses: {
            ...existingResponse.responses,
            activity_responses: responses,
            completion_data: completion_data || {}
          },
          evidence_urls: [...(existingResponse.evidence_urls || []), ...(evidence_urls || [])],
          updated_at: new Date().toISOString()
        })
        .eq('id', existingResponse.id)
        .select()
        .single()

      if (error) {
        console.error('❌ Error updating activity response:', error)
        return NextResponse.json({ 
          error: 'Error al actualizar respuesta',
          details: error.message 
        }, { status: 500 })
      }

      result = data
      console.log('✅ Activity response updated:', result.id)
    } else {
      // Create new response
      const { data, error } = await supabase
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
          completed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
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

      result = data
      console.log('✅ Activity response created:', result.id)
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
      // Don't fail the whole request if RPC doesn't exist
    }

    return NextResponse.json({
      success: true,
      response_id: result.id,
      message: 'Respuesta guardada exitosamente'
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

    const { data, error } = await supabase
      .from('lesson_responses')
      .select('*')
      .eq('enrollment_id', enrollment.id)
      .eq('lesson_id', lesson_id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('❌ Error fetching activity response:', error)
      return NextResponse.json({ 
        error: 'Error al recuperar respuesta',
        details: error.message 
      }, { status: 500 })
    }

    // Extract activity responses from the responses JSONB field
    const activityResponses = data?.responses?.activity_responses || {}

    return NextResponse.json({
      response: data ? { 
        ...data,
        responses: activityResponses // Return just the activity responses part
      } : null
    })

  } catch (error) {
    console.error('❌ Critical error fetching activity response:', error)
    return NextResponse.json({ 
      error: 'Error del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

