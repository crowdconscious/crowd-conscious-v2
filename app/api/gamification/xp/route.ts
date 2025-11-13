import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { ApiResponse } from '@/lib/api-responses'
import { moderateRateLimit, getRateLimitIdentifier, checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'

/**
 * GET /api/gamification/xp
 * Get user's current XP and tier information
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return ApiResponse.unauthorized('Authentication required', 'AUTHENTICATION_REQUIRED')
    }

    // Rate limiting
    const identifier = await getRateLimitIdentifier(request, user.id)
    const rateLimitResult = await checkRateLimit(moderateRateLimit, identifier)
    if (rateLimitResult && !rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult.limit, rateLimitResult.remaining, rateLimitResult.reset)
    }

    // Get user XP data
    const { data: userXP, error: xpError } = await supabase
      .from('user_xp')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (xpError && xpError.code !== 'PGRST116') {
      console.error('Error fetching user XP:', xpError)
      return ApiResponse.serverError('Failed to fetch XP data', 'XP_FETCH_ERROR', { message: xpError.message })
    }

    // If no XP record exists, create one
    if (!userXP) {
      const { data: newXP, error: createError } = await supabase
        .from('user_xp')
        .insert({
          user_id: user.id,
          total_xp: 0,
          current_tier: 1,
          tier_progress: 0.0,
          xp_to_next_tier: 500
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating user XP:', createError)
        return ApiResponse.serverError('Failed to initialize XP', 'XP_INIT_ERROR', { message: createError.message })
      }

      return ApiResponse.ok({
        xp: newXP,
        progress: await calculateProgress(supabase, user.id, newXP)
      })
    }

    // Calculate progress
    const progress = await calculateProgress(supabase, user.id, userXP)

    return ApiResponse.ok({
      xp: userXP,
      progress
    })
  } catch (error: any) {
    console.error('Error in XP API:', error)
    return ApiResponse.serverError('Internal server error', 'XP_SERVER_ERROR', { message: error.message })
  }
}

/**
 * POST /api/gamification/xp
 * Award XP to user for an action
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return ApiResponse.unauthorized('Authentication required', 'AUTHENTICATION_REQUIRED')
    }

    // Rate limiting (stricter for XP awards)
    const identifier = await getRateLimitIdentifier(request, user.id)
    const rateLimitResult = await checkRateLimit(moderateRateLimit, identifier)
    if (rateLimitResult && !rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult.limit, rateLimitResult.remaining, rateLimitResult.reset)
    }

    const body = await request.json()
    const { action_type, action_id, description } = body

    if (!action_type) {
      return ApiResponse.badRequest('action_type is required', 'MISSING_ACTION_TYPE')
    }

    // Award XP using database function
    const { data: result, error } = await supabase.rpc('award_xp', {
      p_user_id: user.id,
      p_action_type: action_type,
      p_action_id: action_id || null,
      p_description: description || null
    })

    if (error) {
      console.error('Error awarding XP:', error)
      return ApiResponse.serverError('Failed to award XP', 'XP_AWARD_ERROR', { message: error.message })
    }

    // Check for achievements
    const { data: achievements } = await supabase.rpc('check_achievements', {
      p_user_id: user.id,
      p_action_type: action_type,
      p_action_id: action_id || null
    })

    return ApiResponse.ok({
      ...result,
      achievements: achievements?.unlocked || []
    })
  } catch (error: any) {
    console.error('Error in XP award API:', error)
    return ApiResponse.serverError('Internal server error', 'XP_AWARD_SERVER_ERROR', { message: error.message })
  }
}

/**
 * Helper function to calculate tier progress
 */
async function calculateProgress(supabase: any, userId: string, userXP: any) {
  const { data: progress } = await supabase.rpc('calculate_tier_progress', {
    p_user_id: userId
  })

  return progress || {
    tier: userXP.current_tier,
    progress: userXP.tier_progress,
    xp_to_next: userXP.xp_to_next_tier,
    total_xp: userXP.total_xp
  }
}

