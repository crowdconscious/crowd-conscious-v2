import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ApiResponse } from '@/lib/api-responses'

// Disable caching - always fetch fresh module data
export const dynamic = 'force-dynamic'
export const revalidate = 0

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ moduleId: string }> }
) {
  try {
    const { moduleId } = await context.params
    
    // Use admin client to bypass RLS (initialized in function scope)
    const supabase = getSupabaseAdmin()

    console.log(`🔍 API: Fetching module: ${moduleId}`)

    // Fetch the module from database
    const { data: module, error } = await supabase
      .from('marketplace_modules')
      .select(`
        id,
        title,
        slug,
        description,
        core_value,
        lesson_count,
        estimated_duration_minutes,
        base_price_mxn,
        status,
        difficulty_level
      `)
      .eq('id', moduleId)
      .single()

    if (error || !module) {
      console.error('❌ API: Module not found:', error)
      return ApiResponse.notFound('Module', 'MODULE_NOT_FOUND')
    }

    // Transform to match frontend format
    const transformedModule = {
      id: module.id,
      title: module.title,
      slug: module.slug,
      description: module.description,
      core_value: module.core_value,
      lesson_count: module.lesson_count,
      duration: `${module.estimated_duration_minutes || 45} min`,
      price: module.base_price_mxn,
      status: module.status,
      difficulty: module.difficulty_level || 'intermediate'
    }

    console.log('✅ API: Module fetched successfully:', module.title)
    return ApiResponse.ok({ module: transformedModule })

  } catch (error: any) {
    console.error('❌ API: Critical error in module fetch:', error)
    return ApiResponse.serverError('Failed to fetch module', 'MODULE_FETCH_ERROR', { 
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

