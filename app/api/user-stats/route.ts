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

      // Enrich with prediction/fund stats
      const { count: votesCast } = await supabase
        .from('market_votes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
      const { data: fundVotes } = await supabase
        .from('fund_votes')
        .select('cycle')
        .eq('user_id', user.id)
      const fundVoteCycles = new Set(fundVotes?.map((v) => v.cycle) ?? []).size
      const { data: correctVotes } = await supabase
        .from('market_votes')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_correct', true)

      return ApiResponse.ok({
        ...newStats,
        votes_cast: votesCast ?? 0,
        fund_vote_cycles: fundVoteCycles,
        correct_predictions: correctVotes?.length ?? 0,
        sponsorships_made: 0,
      })
    }

    if (error) {
      console.error('Error fetching user stats:', error)
      return ApiResponse.serverError('Failed to fetch user stats', 'USER_STATS_FETCH_ERROR', { message: error.message })
    }

    // Enrich with prediction/fund stats for achievements (market_votes, fund_votes)
    const { count: votesCast } = await supabase
      .from('market_votes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    const { data: fundVotes } = await supabase
      .from('fund_votes')
      .select('cycle')
      .eq('user_id', user.id)
    const fundVoteCycles = new Set(fundVotes?.map((v) => v.cycle) ?? []).size

    const { data: correctVotes } = await supabase
      .from('market_votes')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_correct', true)
    const correctPredictions = correctVotes?.length ?? 0

    return ApiResponse.ok({
      ...data,
      votes_cast: votesCast ?? data?.votes_cast ?? 0,
      fund_vote_cycles: fundVoteCycles,
      correct_predictions: correctPredictions,
      sponsorships_made: data?.sponsorships_made ?? 0,
    })

  } catch (error: any) {
    console.error('API error:', error)
    return ApiResponse.serverError('Internal server error', 'USER_STATS_API_ERROR', { message: error.message })
  }
}
