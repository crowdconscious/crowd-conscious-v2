import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { ApiResponse } from '@/lib/api-responses'

/**
 * GET /api/gamification/leaderboard
 * Get leaderboard (top users by XP)
 * Public endpoint - no authentication required
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')
    const tierFilter = searchParams.get('tier') ? parseInt(searchParams.get('tier')!) : null

    // Validate inputs
    if (limit > 1000) {
      return ApiResponse.badRequest('Limit cannot exceed 1000', 'INVALID_LIMIT')
    }

    if (offset < 0) {
      return ApiResponse.badRequest('Offset cannot be negative', 'INVALID_OFFSET')
    }

    if (tierFilter && (tierFilter < 1 || tierFilter > 5)) {
      return ApiResponse.badRequest('Tier must be between 1 and 5', 'INVALID_TIER')
    }

    // Get leaderboard using database function
    const { data: leaderboard, error } = await supabase.rpc('get_leaderboard', {
      p_limit: limit,
      p_offset: offset,
      p_tier_filter: tierFilter
    })

    if (error) {
      console.error('Error fetching leaderboard:', error)
      return ApiResponse.serverError('Failed to fetch leaderboard', 'LEADERBOARD_FETCH_ERROR', { message: error.message })
    }

    // Get current user's rank if authenticated
    let userRank = null
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: userLeaderboard } = await supabase
        .from('leaderboards')
        .select('rank, total_xp, tier')
        .eq('user_id', user.id)
        .single()

      if (userLeaderboard) {
        userRank = {
          rank: userLeaderboard.rank,
          total_xp: userLeaderboard.total_xp,
          tier: userLeaderboard.tier
        }
      }
    }

    return ApiResponse.ok({
      leaderboard: leaderboard || [],
      user_rank: userRank,
      pagination: {
        limit,
        offset,
        has_more: (leaderboard?.length || 0) === limit
      }
    })
  } catch (error: any) {
    console.error('Error in leaderboard API:', error)
    return ApiResponse.serverError('Internal server error', 'LEADERBOARD_SERVER_ERROR', { message: error.message })
  }
}

