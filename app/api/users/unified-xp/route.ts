import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

/**
 * GET /api/users/unified-xp
 * 
 * Returns unified XP for current user (community + learning)
 * 
 * Response:
 * {
 *   total_xp: number,
 *   community_xp: number,
 *   learning_xp: number,
 *   breakdown: {
 *     modules_completed: number,
 *     lessons_completed: number,
 *     posts_created: number,
 *     comments_posted: number
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get XP breakdown from view
    const { data: xpData, error: xpError } = await supabase
      .from('user_xp_breakdown')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (xpError) {
      console.error('Error fetching XP breakdown:', xpError)
      
      // Fallback: calculate manually if view doesn't exist
      const { data: userStats } = await supabase
        .from('user_stats')
        .select('total_xp')
        .eq('user_id', user.id)
        .single()

      const { data: enrollments } = await supabase
        .from('course_enrollments')
        .select('xp_earned, completed')
        .eq('user_id', user.id)

      const communityXP = userStats?.total_xp || 0
      const learningXP = enrollments?.reduce((sum, e) => sum + (e.xp_earned || 0), 0) || 0
      const modulesCompleted = enrollments?.filter(e => e.completed).length || 0

      return NextResponse.json({
        total_xp: communityXP + learningXP,
        community_xp: communityXP,
        learning_xp: learningXP,
        breakdown: {
          modules_completed: modulesCompleted,
          lessons_completed: 0, // Can't calculate without more queries
          posts_created: 0,
          comments_posted: 0
        },
        fallback: true
      })
    }

    // Return unified XP data
    return NextResponse.json({
      total_xp: xpData.total_unified_xp,
      community_xp: xpData.community_xp,
      learning_xp: xpData.learning_xp,
      breakdown: {
        modules_completed: xpData.modules_completed || 0,
        lessons_completed: 0, // Not in view yet, would need separate query
        posts_created: xpData.posts_created || 0,
        comments_posted: xpData.comments_posted || 0
      }
    })

  } catch (error) {
    console.error('Error in unified-xp API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

