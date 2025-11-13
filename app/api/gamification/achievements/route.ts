import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { ApiResponse } from '@/lib/api-responses'
import { moderateRateLimit, getRateLimitIdentifier, checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'

/**
 * GET /api/gamification/achievements
 * Get user's achievements
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

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id') || user.id

    // Only allow users to view their own achievements (unless admin)
    if (userId !== user.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin') {
        return ApiResponse.forbidden('Cannot view other users\' achievements', 'FORBIDDEN')
      }
    }

    // Get achievements
    const { data: achievements, error } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false })

    if (error) {
      console.error('Error fetching achievements:', error)
      return ApiResponse.serverError('Failed to fetch achievements', 'ACHIEVEMENTS_FETCH_ERROR', { message: error.message })
    }

    // Get total count
    const { count } = await supabase
      .from('user_achievements')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    return ApiResponse.ok({
      achievements: achievements || [],
      total: count || 0
    })
  } catch (error: any) {
    console.error('Error in achievements API:', error)
    return ApiResponse.serverError('Internal server error', 'ACHIEVEMENTS_SERVER_ERROR', { message: error.message })
  }
}

