import { NextRequest } from 'next/server'
import { createServerAuth } from '@/lib/auth-server'
import { ApiResponse } from '@/lib/api-responses'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerAuth()
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return ApiResponse.unauthorized('Please log in to view your stats')
    }

    // Try to get existing user stats
    const { data, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code === 'PGRST116') {
      // No record found, create initial user stats
      const initialStats = {
        user_id: user.id,
        total_xp: 0,
        level: 1,
        current_streak: 0,
        longest_streak: 0,
        last_activity: new Date().toISOString(),
        votes_cast: 0,
        content_created: 0,
        events_attended: 0,
        comments_posted: 0,
        achievements_unlocked: []
      }

      const { data: newStats, error: insertError } = await supabase
        .from('user_stats')
        .insert(initialStats)
        .select()
        .single()

      if (insertError) {
        console.error('Error creating user stats:', insertError)
        return ApiResponse.serverError('Failed to create user stats', 'USER_STATS_CREATION_ERROR', { message: insertError.message })
      }

      return ApiResponse.ok(newStats)
    }

    if (error) {
      console.error('Error fetching user stats:', error)
      return ApiResponse.serverError('Failed to fetch user stats', 'USER_STATS_FETCH_ERROR', { message: error.message })
    }

    return ApiResponse.ok(data)

  } catch (error: any) {
    console.error('API error:', error)
    return ApiResponse.serverError('Internal server error', 'USER_STATS_API_ERROR', { message: error.message })
  }
}
