import { createServerAuth } from '@/lib/auth-server'
import { ApiResponse } from '@/lib/api-responses'

// Cache landing page stats for 10 minutes (public data, changes infrequently)
export const revalidate = 600

export async function GET() {
  try {
    const supabase = await createServerAuth()
    
    // Get total funding
    const { data: fundingData } = await supabase
      .from('community_content')
      .select('current_funding')
      .eq('type', 'need')
      .not('current_funding', 'is', null)

    const totalFundsRaised = fundingData?.reduce((sum, item) => sum + (item.current_funding || 0), 0) || 0

    // Get active communities count
    const { count: activeCommunities } = await supabase
      .from('communities')
      .select('*', { count: 'exact', head: true })

    // Get fulfilled needs count
    const { count: needsFulfilled } = await supabase
      .from('community_content')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'need')
      .eq('status', 'completed')

    // Get total members
    const { count: totalMembers } = await supabase
      .from('community_members')
      .select('*', { count: 'exact', head: true })

    // Get total users (profiles)
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    const stats = {
      total_funds_raised: totalFundsRaised,
      active_communities: activeCommunities || 0,
      needs_fulfilled: needsFulfilled || 0,
      total_members: totalMembers || 0,
      total_users: totalUsers || 0
    }

    console.log('📊 Landing page stats:', stats)

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
