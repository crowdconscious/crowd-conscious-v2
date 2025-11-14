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

    // Count user's actual actions
    const userId = user.id

    // Count completed modules
    const { count: modulesCompleted } = await supabase
      .from('course_enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('completed_at', 'is', null)

    // Count completed lessons (from lesson_responses)
    const { data: enrollments } = await supabase
      .from('course_enrollments')
      .select('lesson_responses')
      .eq('user_id', userId)

    let lessonsCompleted = 0
    if (enrollments) {
      enrollments.forEach((enrollment: any) => {
        if (enrollment.lesson_responses && Array.isArray(enrollment.lesson_responses)) {
          lessonsCompleted += enrollment.lesson_responses.filter(
            (lesson: any) => lesson.completed === true
          ).length
        }
      })
    }

    // Count votes
    const { count: votesCast } = await supabase
      .from('votes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    // Count sponsorships
    const { count: sponsorshipsMade } = await supabase
      .from('sponsorships')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    // Count content created
    const { count: contentCreated } = await supabase
      .from('community_content')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    // Get current tier
    const { data: userXP } = await supabase
      .from('user_xp')
      .select('total_xp, current_tier')
      .eq('user_id', userId)
      .single()

    const totalXP = userXP?.total_xp || 0
    const currentTier = userXP?.current_tier || (totalXP >= 7501 ? 5 : totalXP >= 3501 ? 4 : totalXP >= 1501 ? 3 : totalXP >= 501 ? 2 : 1)

    const achievementsUnlocked: string[] = []

    // Check and unlock achievements
    const achievementChecks = [
      {
        type: 'FIRST_LESSON_COMPLETED',
        name: 'Getting Started',
        description: 'Complete your first lesson',
        icon: '📚',
        condition: lessonsCompleted >= 1
      },
      {
        type: 'FIRST_MODULE_COMPLETED',
        name: 'First Steps',
        description: 'Complete your first module',
        icon: '🌱',
        condition: (modulesCompleted || 0) >= 1
      },
      {
        type: 'MODULE_5',
        name: 'Knowledge Seeker',
        description: 'Complete 5 modules',
        icon: '📖',
        condition: (modulesCompleted || 0) >= 5
      },
      {
        type: 'MODULE_10',
        name: 'Master Learner',
        description: 'Complete 10 modules',
        icon: '🎓',
        condition: (modulesCompleted || 0) >= 10
      },
      {
        type: 'FIRST_VOTE',
        name: 'Voice Heard',
        description: 'Cast your first vote',
        icon: '🗳️',
        condition: (votesCast || 0) >= 1
      },
      {
        type: 'VOTE_50',
        name: 'Democracy Champion',
        description: 'Cast 50 votes',
        icon: '🏛️',
        condition: (votesCast || 0) >= 50
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
        type: 'FIRST_CONTENT',
        name: 'Creator',
        description: 'Create your first content',
        icon: '✨',
        condition: (contentCreated || 0) >= 1
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
          modules_completed: modulesCompleted || 0,
          lessons_completed: lessonsCompleted,
          votes_cast: votesCast || 0,
          sponsorships_made: sponsorshipsMade || 0,
          content_created: contentCreated || 0,
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

