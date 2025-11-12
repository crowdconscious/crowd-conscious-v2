import { createClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth-server'
import { ApiResponse } from '@/lib/api-responses'

export async function GET() {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return ApiResponse.unauthorized('Please log in to view templates')
    }

    const supabase = await createClient()

    // Fetch template modules
    // For now, we'll return the template from our JSON file
    // In the future, we can store templates in the database with a special flag
    
    const { data: templates, error } = await supabase
      .from('marketplace_modules')
      .select(`
        id,
        title,
        description,
        core_value,
        difficulty_level,
        estimated_duration_hours,
        lesson_count,
        xp_reward,
        thumbnail_url,
        industry_tags
      `)
      .eq('base_price_mxn', 0) // Templates are free
      .eq('status', 'published')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching templates:', error)
      return ApiResponse.serverError('Failed to fetch templates', 'TEMPLATES_FETCH_ERROR', { message: error.message })
    }

    return ApiResponse.ok({ templates: templates || [] })
  } catch (error: any) {
    console.error('Error in GET /api/modules/templates:', error)
    return ApiResponse.serverError('Internal server error', 'TEMPLATES_SERVER_ERROR', { message: error.message })
  }
}

