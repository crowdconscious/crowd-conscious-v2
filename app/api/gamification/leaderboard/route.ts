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

    // Try to use leaderboard_view first (combines user_xp and user_stats)
    let leaderboardQuery = supabase
      .from('leaderboard_view')
      .select('*')
      .order('total_xp', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply tier filter if specified
    if (tierFilter) {
      leaderboardQuery = leaderboardQuery.eq('tier', tierFilter)
    }

    const { data: leaderboardData, error: leaderboardError } = await leaderboardQuery
    
    // Log errors for debugging
    console.log('Leaderboard view query result:', {
      hasError: !!leaderboardError,
      error: leaderboardError,
      dataLength: leaderboardData?.length || 0,
      data: leaderboardData
    })
    
    if (leaderboardError) {
      console.error('Leaderboard view error:', leaderboardError)
    }

    // If view doesn't exist or fails, try user_stats first (it has the actual XP data)
    // Then fall back to user_xp if needed
    let leaderboard: any[] = []
    if (leaderboardError || !leaderboardData || leaderboardData.length === 0) {
      console.log('Falling back to user_stats/user_xp queries')
      
      // Try user_stats FIRST since it has the actual XP data (8 users with XP)
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
      
      console.log('User stats query result:', {
        hasError: !!statsError,
        error: statsError,
        dataLength: statsData?.length || 0,
        firstEntry: statsData?.[0]
      })
      
      if (statsError) {
        console.error('User stats query error:', statsError)
      }
      
      if (!statsError && statsData && statsData.length > 0) {
        console.log('Using user_stats data, mapping entries...')
        // Calculate tier from XP for user_stats
        leaderboard = statsData
          .filter((stat: any) => (stat.total_xp || 0) > 0) // Only show users with XP
          .map((stat: any) => {
            const totalXP = stat.total_xp || 0
            const calculatedTier = totalXP >= 7501 ? 5 : 
                                  totalXP >= 3501 ? 4 : 
                                  totalXP >= 1501 ? 3 : 
                                  totalXP >= 501 ? 2 : 1
            
            // Apply tier filter if specified
            if (tierFilter && calculatedTier !== tierFilter) {
              return null
            }
            
            return {
              user_id: stat.user_id,
              total_xp: totalXP,
              tier: calculatedTier,
              full_name: stat.profiles?.full_name || 'Anonymous User',
              email: stat.profiles?.email,
              avatar_url: stat.profiles?.avatar_url
            }
          })
          .filter((entry: any) => entry !== null) // Remove filtered entries
        console.log('Mapped leaderboard from user_stats:', leaderboard.length, 'entries')
      } else {
        // Fall back to user_xp (though it likely has no XP data)
        console.log('user_stats returned no data, trying user_xp...')
        let xpQuery = supabase
          .from('user_xp')
          .select(`
            user_id,
            total_xp,
            current_tier as tier,
            profiles!inner(full_name, email, avatar_url)
          `)
          .order('total_xp', { ascending: false })
          .range(offset, offset + limit - 1)

        if (tierFilter) {
          xpQuery = xpQuery.eq('current_tier', tierFilter)
        }

        const { data: xpData, error: xpError } = await xpQuery

        if (xpError) {
          console.error('User XP query error:', xpError)
        }

        console.log('User XP query result:', {
          hasError: !!xpError,
          error: xpError,
          dataLength: xpData?.length || 0,
          firstEntry: xpData?.[0]
        })

        if (!xpError && xpData && xpData.length > 0) {
          console.log('Using user_xp data, mapping entries...')
          leaderboard = xpData
            .filter((entry: any) => (entry.total_xp || 0) > 0) // Only show users with XP
            .map((entry: any) => ({
              user_id: entry.user_id,
              total_xp: entry.total_xp || 0,
              tier: entry.tier || 1,
              full_name: entry.profiles?.full_name || 'Anonymous User',
              email: entry.profiles?.email,
              avatar_url: entry.profiles?.avatar_url
            }))
          console.log('Mapped leaderboard from user_xp:', leaderboard.length, 'entries')
        } else {
          console.log('No leaderboard data found in user_stats or user_xp')
        }
      }
    } else {
      // Use leaderboard_view data
      console.log('Using leaderboard_view data, mapping entries...')
      leaderboard = leaderboardData.map((entry: any) => ({
        user_id: entry.user_id,
        total_xp: entry.total_xp || 0,
        tier: entry.tier || 1,
        full_name: entry.full_name || 'Anonymous User',
        email: entry.email,
        avatar_url: entry.avatar_url
      }))
      console.log('Mapped leaderboard from view:', leaderboard.length, 'entries')
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
      // Get user's XP from user_xp or user_stats
      const { data: userXP } = await supabase
        .from('user_xp')
        .select('total_xp, current_tier')
        .eq('user_id', user.id)
        .single()

      let userTotalXP = 0
      let userTier = 1
      
      if (userXP && userXP.total_xp) {
        userTotalXP = userXP.total_xp || 0
        userTier = userXP.current_tier || 1
      } else {
        // Fall back to user_stats
        const { data: userStats } = await supabase
          .from('user_stats')
          .select('total_xp')
          .eq('user_id', user.id)
          .single()
        
        if (userStats && userStats.total_xp) {
          userTotalXP = userStats.total_xp || 0
          userTier = userTotalXP >= 7501 ? 5 : 
                    userTotalXP >= 3501 ? 4 : 
                    userTotalXP >= 1501 ? 3 : 
                    userTotalXP >= 501 ? 2 : 1
        }
      }

      // Calculate rank by counting users with more XP from leaderboard
      // Use the same data source as the leaderboard
      let rankCount = 0
      if (leaderboard.length > 0) {
        // Count users in leaderboard with more XP
        rankCount = leaderboard.filter((entry: any) => entry.total_xp > userTotalXP).length
      } else {
        // Fallback: count from database
        const { count: dbRankCount } = await supabase
          .from('user_xp')
          .select('*', { count: 'exact', head: true })
          .gt('total_xp', userTotalXP)
        
        rankCount = dbRankCount || 0
        
        // Also check user_stats if user_xp is empty
        if (rankCount === 0) {
          const { count: statsRankCount } = await supabase
            .from('user_stats')
            .select('*', { count: 'exact', head: true })
            .gt('total_xp', userTotalXP)
          
          rankCount = statsRankCount || 0
        }
      }

      userRank = {
        rank: rankCount + 1,
        total_xp: userTotalXP,
        tier: userTier
      }
    }

    // Log for debugging
    console.log('Leaderboard API response:', {
      leaderboardCount: leaderboardWithRanks?.length || 0,
      userRank,
      firstEntry: leaderboardWithRanks?.[0],
      leaderboardData: leaderboardWithRanks
    })

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

