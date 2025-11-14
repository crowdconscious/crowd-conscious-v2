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

    // Get leaderboard from user_xp table (preferred) or user_stats table
    let leaderboardQuery = supabase
      .from('user_xp')
      .select(`
        user_id,
        total_xp,
        current_tier as tier,
        profiles!inner(full_name, email, avatar_url)
      `)
      .order('total_xp', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply tier filter if specified
    if (tierFilter) {
      leaderboardQuery = leaderboardQuery.eq('current_tier', tierFilter)
    }

    const { data: leaderboardData, error: leaderboardError } = await leaderboardQuery

    // If user_xp table doesn't have data, fall back to user_stats
    let leaderboard: any[] = []
    if (leaderboardError || !leaderboardData || leaderboardData.length === 0) {
      let statsQuery = supabase
        .from('user_stats')
        .select(`
          user_id,
          total_xp,
          profiles!inner(full_name, email, avatar_url)
        `)
        .order('total_xp', { ascending: false })
        .range(offset, offset + limit - 1)

      const { data: statsData, error: statsError } = await statsQuery
      
      if (!statsError && statsData) {
        // Calculate tier from XP for user_stats
        leaderboard = statsData.map((stat: any) => ({
          user_id: stat.user_id,
          total_xp: stat.total_xp,
          tier: stat.total_xp >= 7501 ? 5 : 
                stat.total_xp >= 3501 ? 4 : 
                stat.total_xp >= 1501 ? 3 : 
                stat.total_xp >= 501 ? 2 : 1,
          full_name: stat.profiles?.full_name,
          email: stat.profiles?.email,
          avatar_url: stat.profiles?.avatar_url
        }))
      }
    } else {
      leaderboard = leaderboardData.map((entry: any) => ({
        user_id: entry.user_id,
        total_xp: entry.total_xp,
        tier: entry.tier,
        full_name: entry.profiles?.full_name,
        email: entry.profiles?.email,
        avatar_url: entry.profiles?.avatar_url
      }))
    }

    // Add rank numbers
    const leaderboardWithRanks = leaderboard.map((entry, index) => ({
      ...entry,
      rank: offset + index + 1
    }))

    // Get current user's rank if authenticated
    let userRank = null
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      // Get user's XP and calculate rank
      const { data: userXP } = await supabase
        .from('user_xp')
        .select('total_xp, current_tier')
        .eq('user_id', user.id)
        .single()

      let userTotalXP = 0
      let userTier = 1
      
      if (userXP) {
        userTotalXP = userXP.total_xp
        userTier = userXP.current_tier
      } else {
        // Fall back to user_stats
        const { data: userStats } = await supabase
          .from('user_stats')
          .select('total_xp')
          .eq('user_id', user.id)
          .single()
        
        if (userStats) {
          userTotalXP = userStats.total_xp
          userTier = userTotalXP >= 7501 ? 5 : 
                    userTotalXP >= 3501 ? 4 : 
                    userTotalXP >= 1501 ? 3 : 
                    userTotalXP >= 501 ? 2 : 1
        }
      }

      // Calculate rank by counting users with more XP
      const { count: rankCount } = await supabase
        .from('user_xp')
        .select('*', { count: 'exact', head: true })
        .gt('total_xp', userTotalXP)

      userRank = {
        rank: (rankCount || 0) + 1,
        total_xp: userTotalXP,
        tier: userTier
      }
    }

    return ApiResponse.ok({
      leaderboard: leaderboardWithRanks || [],
      user_rank: userRank,
      pagination: {
        limit,
        offset,
        has_more: (leaderboardWithRanks?.length || 0) === limit
      }
    })
  } catch (error: any) {
    console.error('Error in leaderboard API:', error)
    return ApiResponse.serverError('Internal server error', 'LEADERBOARD_SERVER_ERROR', { message: error.message })
  }
}

