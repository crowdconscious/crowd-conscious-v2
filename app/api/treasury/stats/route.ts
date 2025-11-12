import { NextRequest } from 'next/server'
import { createServerAuth, getCurrentUser } from '@/lib/auth-server'
import { ApiResponse } from '@/lib/api-responses'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return ApiResponse.unauthorized('Authentication required', 'AUTHENTICATION_REQUIRED')
    }

    const { searchParams } = new URL(request.url)
    const communityId = searchParams.get('communityId')

    if (!communityId) {
      return ApiResponse.badRequest('Community ID is required', 'MISSING_COMMUNITY_ID')
    }

    const supabase = await createServerAuth()

    // Check if user is a community member
    const { data: membership } = await supabase
      .from('community_members')
      .select('id, role')
      .eq('community_id', communityId)
      .eq('user_id', (user as any).id)
      .single()

    if (!membership) {
      return ApiResponse.forbidden('You must be a community member to view treasury stats', 'NOT_COMMUNITY_MEMBER')
    }

    // Get treasury stats using RPC
    const { data, error } = await (supabase as any).rpc('get_treasury_stats', {
      p_community_id: communityId,
    })

    if (error) {
      console.error('Error fetching treasury stats:', error)
      return ApiResponse.serverError('Failed to fetch treasury stats', 'TREASURY_STATS_ERROR', { message: error.message })
    }

    return ApiResponse.ok({
      ...data,
      userRole: membership.role,
    })
  } catch (error: any) {
    console.error('Treasury stats error:', error)
    return ApiResponse.serverError('Failed to fetch treasury stats', 'TREASURY_STATS_SERVER_ERROR', { message: error.message })
  }
}

