import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/enrollments?module_id=UUID
 * Fetch enrollment ID for current user and module
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const module_id = searchParams.get('module_id')

    if (!module_id) {
      return NextResponse.json({ error: 'module_id requerido' }, { status: 400 })
    }

    console.log('🔍 Fetching enrollment for:', { user_id: user.id, module_id })

    // Query course_enrollments to get enrollment_id
    const { data, error } = await supabase
      .from('course_enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('module_id', module_id)
      .is('course_id', null) // Individual module enrollment
      .single()

    if (error) {
      if (error.code === 'PGRST116') { // Not found
        console.warn('⚠️ No enrollment found for user:', user.id, 'module:', module_id)
        return NextResponse.json({ 
          enrollment_id: null,
          message: 'No enrollment found' 
        })
      }
      
      console.error('❌ Error fetching enrollment:', error)
      return NextResponse.json({ 
        error: 'Error al buscar inscripción',
        details: error.message 
      }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ 
        enrollment_id: null,
        message: 'No enrollment found' 
      })
    }

    console.log('✅ Found enrollment ID:', data.id)

    return NextResponse.json({
      enrollment_id: data.id,
      success: true
    })

  } catch (error) {
    console.error('❌ Critical error fetching enrollment:', error)
    return NextResponse.json({ 
      error: 'Error del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

