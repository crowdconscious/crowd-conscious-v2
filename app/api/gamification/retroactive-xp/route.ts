import { NextRequest, NextResponse } from 'next/server'
import { createServerAuth } from '@/lib/auth-server'
import { ApiResponse } from '@/lib/api-responses'

/**
 * POST /api/gamification/retroactive-xp
 * Calculate and award retroactive XP for existing users
 * This endpoint calculates XP based on historical actions
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerAuth()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return ApiResponse.unauthorized('Authentication required')
    }

    // Check if user is admin (optional - remove if you want all users to trigger this)
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()

    // Allow all authenticated users to calculate their own retroactive XP
    // Or restrict to admins: if (profile?.user_type !== 'admin') { return ApiResponse.forbidden() }

    const { targetUserId } = await request.json()
    const userId = targetUserId || user.id

    let totalXPAwarded = 0
    const results: any = {
      lessons: 0,
      modules: 0,
      votes: 0,
      sponsorships: 0,
      content: 0
    }

    // 1. Award XP for completed lessons
    const { data: completedLessons } = await supabase
      .from('lesson_progress')
      .select('lesson_id, completed_at')
      .eq('user_id', userId)
      .eq('completed', true)

    if (completedLessons) {
      for (const lesson of completedLessons) {
        // Check if XP already awarded
        const { data: existingXP } = await supabase
          .from('xp_transactions')
          .select('id')
          .eq('user_id', userId)
          .eq('action_type', 'lesson_completed')
          .eq('action_id', lesson.lesson_id)
          .single()

        if (!existingXP) {
          try {
            const { data: xpResult } = await supabase.rpc('award_xp', {
              p_user_id: userId,
              p_action_type: 'lesson_completed',
              p_action_id: lesson.lesson_id,
              p_description: 'Retroactive: Completed lesson'
            })
            if (xpResult) {
              totalXPAwarded += (xpResult as any).xp_amount || 50
              results.lessons++
            }
          } catch (error) {
            console.error('Error awarding lesson XP:', error)
          }
        }
      }
    }

    // 2. Award XP for completed modules
    const { data: completedModules } = await supabase
      .from('course_enrollments')
      .select('module_id, completed_at')
      .eq('user_id', userId)
      .eq('completed', true)

    if (completedModules) {
      for (const module of completedModules) {
        const { data: existingXP } = await supabase
          .from('xp_transactions')
          .select('id')
          .eq('user_id', userId)
          .eq('action_type', 'module_completed')
          .eq('action_id', module.module_id)
          .single()

        if (!existingXP) {
          try {
            const { data: xpResult } = await supabase.rpc('award_xp', {
              p_user_id: userId,
              p_action_type: 'module_completed',
              p_action_id: module.module_id,
              p_description: 'Retroactive: Completed module'
            })
            if (xpResult) {
              totalXPAwarded += (xpResult as any).xp_amount || 200
              results.modules++
            }
          } catch (error) {
            console.error('Error awarding module XP:', error)
          }
        }
      }
    }

    // 3. Award XP for votes
    const { data: votes } = await supabase
      .from('votes')
      .select('content_id, created_at')
      .eq('user_id', userId)
      .eq('vote_type', 'up')

    if (votes) {
      for (const vote of votes) {
        const { data: existingXP } = await supabase
          .from('xp_transactions')
          .select('id')
          .eq('user_id', userId)
          .eq('action_type', 'vote_content')
          .eq('action_id', vote.content_id)
          .single()

        if (!existingXP) {
          try {
            const { data: xpResult } = await supabase.rpc('award_xp', {
              p_user_id: userId,
              p_action_type: 'vote_content',
              p_action_id: vote.content_id,
              p_description: 'Retroactive: Voted on content'
            })
            if (xpResult) {
              totalXPAwarded += (xpResult as any).xp_amount || 10
              results.votes++
            }
          } catch (error) {
            console.error('Error awarding vote XP:', error)
          }
        }
      }
    }

    // 4. Award XP for sponsorships
    const { data: sponsorships } = await supabase
      .from('sponsorships')
      .select('id, created_at')
      .eq('sponsor_id', userId)
      .eq('status', 'completed')

    if (sponsorships) {
      for (const sponsorship of sponsorships) {
        const { data: existingXP } = await supabase
          .from('xp_transactions')
          .select('id')
          .eq('user_id', userId)
          .eq('action_type', 'sponsor_need')
          .eq('action_id', sponsorship.id)
          .single()

        if (!existingXP) {
          try {
            const { data: xpResult } = await supabase.rpc('award_xp', {
              p_user_id: userId,
              p_action_type: 'sponsor_need',
              p_action_id: sponsorship.id,
              p_description: 'Retroactive: Sponsorship'
            })
            if (xpResult) {
              totalXPAwarded += (xpResult as any).xp_amount || 100
              results.sponsorships++
            }
          } catch (error) {
            console.error('Error awarding sponsorship XP:', error)
          }
        }
      }
    }

    // 5. Award XP for content creation
    const { data: content } = await supabase
      .from('community_content')
      .select('id, created_at')
      .eq('created_by', userId)
      .eq('status', 'published')

    if (content) {
      for (const item of content) {
        const { data: existingXP } = await supabase
          .from('xp_transactions')
          .select('id')
          .eq('user_id', userId)
          .eq('action_type', 'create_content')
          .eq('action_id', item.id)
          .single()

        if (!existingXP) {
          try {
            const { data: xpResult } = await supabase.rpc('award_xp', {
              p_user_id: userId,
              p_action_type: 'create_content',
              p_action_id: item.id,
              p_description: 'Retroactive: Content creation'
            })
            if (xpResult) {
              totalXPAwarded += (xpResult as any).xp_amount || 75
              results.content++
            }
          } catch (error) {
            console.error('Error awarding content XP:', error)
          }
        }
      }
    }

    return ApiResponse.ok({
      success: true,
      total_xp_awarded: totalXPAwarded,
      breakdown: results,
      message: `Retroactive XP calculation complete. ${totalXPAwarded} XP awarded.`
    })

  } catch (error: any) {
    console.error('Error calculating retroactive XP:', error)
    return ApiResponse.serverError('Failed to calculate retroactive XP', 'RETROACTIVE_XP_ERROR', { message: error.message })
  }
}

