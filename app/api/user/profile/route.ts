import { createClient } from '@/lib/supabase-server'
import { ApiResponse } from '@/lib/api-responses'

/**
 * GET /api/user/profile
 * 
 * Fetches the current user's profile information
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return ApiResponse.unauthorized('Please log in to view your profile')
    }

    // Get user's profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error || !profile) {
      return ApiResponse.notFound('Profile', 'PROFILE_NOT_FOUND')
    }

    return ApiResponse.ok(profile)
  } catch (error: any) {
    console.error('Error fetching profile:', error)
    return ApiResponse.serverError('Server error', 'PROFILE_FETCH_ERROR', { message: error.message })
  }
}

