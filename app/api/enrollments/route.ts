import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { ApiResponse } from '@/lib/api-responses'

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
      return ApiResponse.unauthorized('Please log in to view enrollments')
    }

    const { searchParams } = new URL(request.url)
    const module_id = searchParams.get('module_id')

    if (!module_id) {
      return ApiResponse.badRequest('module_id requerido', 'MISSING_MODULE_ID')
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
        return ApiResponse.ok({ 
          enrollment_id: null,
          message: 'No enrollment found' 
        })
      }
      
      console.error('❌ Error fetching enrollment:', error)
      return ApiResponse.serverError('Error al buscar inscripción', 'ENROLLMENT_FETCH_ERROR', { message: error.message })
    }

    if (!data) {
      return ApiResponse.ok({ 
        enrollment_id: null,
        message: 'No enrollment found' 
      })
    }

    console.log('✅ Found enrollment ID:', data.id)

    return ApiResponse.ok({
      enrollment_id: data.id
    })

  } catch (error: any) {
    console.error('❌ Critical error fetching enrollment:', error)
    return ApiResponse.serverError('Error del servidor', 'ENROLLMENT_FETCH_SERVER_ERROR', { 
      message: error instanceof Error ? error.message : 'Error desconocido'
    })
  }
}

