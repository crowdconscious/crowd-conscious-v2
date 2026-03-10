import { NextRequest, NextResponse } from 'next/server'
import { createServerAuth } from '@/lib/auth-server'

/**
 * API Route to retroactively unlock achievements for the current user
 * Checks past actions and unlocks achievements that should have been unlocked
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerAuth()
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Count user's actual actions (impact-focused: predictions, fund, sponsorships)
    const userId = user.id

    // Count prediction votes (market_votes)
    const { count: votesCast } = await supabase
      .from('market_votes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    // Count correct predictions
    const { data: correctVotes } = await supabase
      .from('market_votes')
      .select('id')
      .eq('user_id', userId)
      .eq('is_correct', true)
    const correctPredictions = correctVotes?.length ?? 0

    // Count distinct fund vote cycles
    const { data: fundVotes } = await supabase
      .from('fund_votes')
      .select('cycle')
      .eq('user_id', userId)
    const fundVoteCycles = new Set(fundVotes?.map((v) => v.cycle) ?? []).size

    // Legacy: sponsorships table removed
    const sponsorshipsMade = 0

    // Get current tier
    const { data: userXP } = await supabase
      .from('user_xp')
      .select('total_xp, current_tier')
      .eq('user_id', userId)
      .single()

    const totalXP = userXP?.total_xp || 0
    const currentTier = userXP?.current_tier || (totalXP >= 7501 ? 5 : totalXP >= 3501 ? 4 : totalXP >= 1501 ? 3 : totalXP >= 501 ? 2 : 1)

    const achievementsUnlocked: string[] = []

    // Check and unlock achievements (impact-focused)
    const achievementChecks = [
      {
        type: 'FIRST_VOTE',
        name: 'Voice Heard',
        description: 'Cast your first prediction',
        icon: '🗳️',
        condition: (votesCast || 0) >= 1
      },
      {
        type: 'VOTE_10',
        name: 'Active Predictor',
        description: 'Make 10 predictions',
        icon: '📊',
        condition: (votesCast || 0) >= 10
      },
      {
        type: 'VOTE_50',
        name: 'Democracy Champion',
        description: 'Cast 50 predictions',
        icon: '🏛️',
        condition: (votesCast || 0) >= 50
      },
      {
        type: 'FIRST_FUND_VOTE',
        name: 'Fund Voice',
        description: 'Vote for your first cause in the Conscious Fund',
        icon: '💚',
        condition: fundVoteCycles >= 1
      },
      {
        type: 'FUND_CHAMPION',
        name: 'Fund Champion',
        description: 'Vote for causes across 5 different months',
        icon: '🌍',
        condition: fundVoteCycles >= 5
      },
      {
        type: 'FIRST_SPONSORSHIP',
        name: 'First Contribution',
        description: 'Make your first sponsorship',
        icon: '💝',
        condition: (sponsorshipsMade || 0) >= 1
      },
      {
        type: 'SPONSOR_10',
        name: 'Generous Giver',
        description: 'Make 10 sponsorships',
        icon: '🎁',
        condition: (sponsorshipsMade || 0) >= 10
      },
      {
        type: 'FIRST_CORRECT',
        name: 'Sharp Insight',
        description: 'Get your first correct prediction',
        icon: '🎯',
        condition: correctPredictions >= 1
      },
      {
        type: 'CORRECT_10',
        name: 'Accurate Mind',
        description: 'Get 10 correct predictions',
        icon: '✨',
        condition: correctPredictions >= 10
      },
      {
        type: 'TIER_2',
        name: 'Contributor',
        description: 'Reach Contributor tier',
        icon: '🌊',
        condition: currentTier >= 2
      },
      {
        type: 'TIER_3',
        name: 'Changemaker',
        description: 'Reach Changemaker tier',
        icon: '💜',
        condition: currentTier >= 3
      },
      {
        type: 'TIER_4',
        name: 'Impact Leader',
        description: 'Reach Impact Leader tier',
        icon: '⭐',
        condition: currentTier >= 4
      },
      {
        type: 'TIER_5',
        name: 'Legend',
        description: 'Reach Legend tier',
        icon: '👑',
        condition: currentTier >= 5
      }
    ]

    // Check each achievement and unlock if condition is met
    for (const achievement of achievementChecks) {
      if (achievement.condition) {
        // Check if already unlocked
        const { data: existing } = await supabase
          .from('user_achievements')
          .select('id')
          .eq('user_id', userId)
          .eq('achievement_type', achievement.type)
          .single()

        if (!existing) {
          // Unlock the achievement
          const { error: insertError } = await supabase
            .from('user_achievements')
            .insert({
              user_id: userId,
              achievement_type: achievement.type,
              achievement_name: achievement.name,
              achievement_description: achievement.description,
              icon_url: achievement.icon
            })

          if (!insertError) {
            achievementsUnlocked.push(achievement.type)
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        achievements_unlocked: achievementsUnlocked.length,
        achievements: achievementsUnlocked,
        stats: {
          votes_cast: votesCast || 0,
          fund_vote_cycles: fundVoteCycles,
          correct_predictions: correctPredictions,
          sponsorships_made: sponsorshipsMade || 0,
          current_tier: currentTier,
          total_xp: totalXP
        }
      }
    })

  } catch (error: any) {
    console.error('Error unlocking retroactive achievements:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to unlock achievements',
        details: error.message
      },
      { status: 500 }
    )
  }
}

