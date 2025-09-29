import { NextResponse } from 'next/server'
import { createServerAuth } from '@/lib/auth-server'

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
      return NextResponse.json({ communities: [] })
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

    return NextResponse.json({ 
      communities: communitiesWithActivity,
      count: communitiesWithActivity.length 
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ 
      communities: [],
      error: 'Failed to fetch communities' 
    })
  }
}
