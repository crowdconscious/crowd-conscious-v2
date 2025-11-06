import { createAdminClient } from '@/lib/supabase-admin'
import { ApiResponse } from '@/lib/api-responses'
import { NextRequest } from 'next/server'

// GET /api/marketplace/templates - Fetch template modules
export async function GET(request: NextRequest) {
  try {
    const adminClient = createAdminClient()
    
    console.log('🔍 Fetching template modules...')
    
    const { data: templates, error } = await adminClient
      .from('marketplace_modules')
      .select(`
        id,
        title,
        description,
        core_value,
        difficulty_level,
        estimated_duration_hours,
        xp_reward,
        thumbnail_url,
        base_price_mxn,
        price_per_50_employees,
        lessons:module_lessons(
          id,
          lesson_order,
          title,
          description,
          estimated_minutes,
          xp_reward,
          key_points
        )
      `)
      .eq('status', 'published')
      .limit(0)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('❌ Error fetching templates:', error)
      throw error
    }
    
    console.log(`✅ Found ${templates?.length || 0} template(s)`)
    
    return ApiResponse.ok({ 
      templates: templates || [],
      count: templates?.length || 0
    })
  } catch (error) {
    console.error('💥 Error in GET /api/marketplace/templates:', error)
    return ApiResponse.serverError('Failed to fetch templates')
  }
}

