import { createServerAuth } from '@/lib/auth-server'
import { ApiResponse } from '@/lib/api-responses'

// Cache landing page stats for 10 minutes (public data, changes infrequently)
export const revalidate = 600

export async function GET() {
  try {
    const supabase = await createServerAuth()

    // Legacy community stats removed. Use prediction platform + profiles.
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    const stats = {
      total_funds_raised: 0,
      active_communities: 0,
      needs_fulfilled: 0,
      total_members: totalUsers || 0,
      total_users: totalUsers || 0
    }

    return ApiResponse.ok({ stats })
  } catch (error: any) {
    console.error('Stats API error:', error)
    return ApiResponse.ok({
      stats: {
        total_funds_raised: 0,
        active_communities: 0,
        needs_fulfilled: 0,
        total_members: 0,
        total_users: 0
      }
    })
  }
}
