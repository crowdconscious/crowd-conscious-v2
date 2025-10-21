import { NextRequest, NextResponse } from 'next/server'
import { createServerAuth, getCurrentUser } from '@/lib/auth-server'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const communityId = searchParams.get('communityId')

    if (!communityId) {
      return NextResponse.json({ error: 'Community ID is required' }, { status: 400 })
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
      return NextResponse.json(
        { error: 'You must be a community member to view treasury stats' },
        { status: 403 }
      )
    }

    // Get treasury stats using RPC
    const { data, error } = await supabase.rpc('get_treasury_stats', {
      p_community_id: communityId,
    })

    if (error) {
      console.error('Error fetching treasury stats:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      ...data,
      userRole: membership.role,
    })
  } catch (error: any) {
    console.error('Treasury stats error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch treasury stats' },
      { status: 500 }
    )
  }
}

