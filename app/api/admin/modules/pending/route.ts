import { getCurrentUser } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase-server'
import { ApiResponse } from '@/lib/api-responses'

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user || user.user_type !== 'admin') {
      return ApiResponse.unauthorized('Admin access required', 'NOT_ADMIN')
    }

    const supabase = await createClient()

    // Fetch all modules with review status
    const { data: modules, error } = await (supabase as any)
      .from('marketplace_modules')
      .select(`
        *,
        communities (name, slug),
        profiles (full_name, email)
      `)
      .eq('status', 'review')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching pending modules:', error)
      return ApiResponse.serverError('Failed to fetch modules', 'MODULES_FETCH_ERROR', { message: error.message })
    }

    return ApiResponse.ok({ modules: modules || [] })
  } catch (error: any) {
    console.error('Error in GET /api/admin/modules/pending:', error)
    return ApiResponse.serverError('Internal server error', 'MODULES_PENDING_SERVER_ERROR', { message: error.message })
  }
}

