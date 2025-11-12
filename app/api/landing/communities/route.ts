import { createServerAuth } from '@/lib/auth-server'
import { ApiResponse } from '@/lib/api-responses'

export async function GET() {
  try {
    const supabase = await createServerAuth()
    
    // Get communities with basic info
    const { data: communities, error } = await supabase
      .from('communities')
      .select(`
        id, 
        name, 
        description, 
        image_url,
        member_count, 
        address, 
        core_values,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(8)

    if (error) {
      console.error('Error fetching communities:', error)
      return ApiResponse.ok({ communities: [] })
    }

    // Add recent activity for each community
    const communitiesWithActivity = await Promise.all(
      (communities || []).map(async (community) => {
        const { data: contentData } = await supabase
          .from('community_content')
          .select('type')
          .eq('community_id', community.id)
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

        return {
          ...community,
          recent_activity: {
            type: 'content',
            count: contentData?.length || 0
          }
        }
      })
    )

    return ApiResponse.ok({ 
      communities: communitiesWithActivity,
      count: communitiesWithActivity.length 
    })

  } catch (error: any) {
    console.error('API error:', error)
    return ApiResponse.serverError('Failed to fetch communities', 'COMMUNITIES_FETCH_ERROR', { 
      message: error.message 
    })
  }
}
