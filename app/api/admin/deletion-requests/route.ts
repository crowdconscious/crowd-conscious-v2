import { NextRequest, NextResponse } from 'next/server'
import { createServerAuth, getCurrentUser } from '@/lib/auth-server'

// Get all deletion requests (admin only)
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const supabase = await createServerAuth()

    // Check if user is admin
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('user_type')
      .eq('id', (user as any).id)
      .single()

    if ((profile as any)?.user_type !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Fetch deletion requests with requester info
    const { data: requests, error } = await (supabase as any)
      .from('deletion_requests')
      .select(`
        *,
        requester:requested_by (
          full_name,
          email
        ),
        reviewer:reviewed_by (
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching deletion requests:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: requests }, { status: 200 })

  } catch (error: any) {
    console.error('API error fetching deletion requests:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// Create deletion request
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { request_type, target_id, target_name, reason } = await request.json()

    if (!request_type || !target_id || !target_name) {
      return NextResponse.json({ 
        error: 'Missing required fields: request_type, target_id, target_name' 
      }, { status: 400 })
    }

    const supabase = await createServerAuth()

    // Check permissions based on request type
    if (request_type === 'community') {
      // Check if user is founder of the community
      const { data: membership } = await (supabase as any)
        .from('community_members')
        .select('role')
        .eq('community_id', target_id)
        .eq('user_id', (user as any).id)
        .single()

      if ((membership as any)?.role !== 'founder') {
        // Check if user is admin
        const { data: profile } = await (supabase as any)
          .from('profiles')
          .select('user_type')
          .eq('id', (user as any).id)
          .single()

        if ((profile as any)?.user_type !== 'admin') {
          return NextResponse.json({ 
            error: 'Only community founders or admins can request community deletion' 
          }, { status: 403 })
        }
      }
    } else {
      // For user and content deletion, only admins can request
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('user_type')
        .eq('id', (user as any).id)
        .single()

      if ((profile as any)?.user_type !== 'admin') {
        return NextResponse.json({ 
          error: 'Only admins can request user or content deletion' 
        }, { status: 403 })
      }
    }

    // Create deletion request
    const { data: deletionRequest, error } = await (supabase as any)
      .from('deletion_requests')
      .insert({
        request_type,
        target_id,
        target_name,
        requested_by: (user as any).id,
        reason: reason || null
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating deletion request:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Deletion request created successfully',
      data: deletionRequest 
    }, { status: 201 })

  } catch (error: any) {
    console.error('API error creating deletion request:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
