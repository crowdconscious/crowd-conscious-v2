import { NextRequest, NextResponse } from 'next/server'
import { createServerAuth, getCurrentUser } from '@/lib/auth-server'

// Helper function to check if user is admin
async function checkAdminPermission(user: any): Promise<boolean> {
  if (!user) return false
  
  // Check if user has admin user_type
  return user.user_type === 'admin'
}

// Helper function to check if user is community founder/admin
async function checkCommunityAdminPermission(communityId: string, userId: string): Promise<boolean> {
  const supabase = await createServerAuth()
  
  const { data, error } = await supabase
    .from('community_members')
    .select('role')
    .eq('community_id', communityId)
    .eq('user_id', userId)
    .single()

  if (error) return false
  
  return (data as any)?.role === 'founder' || (data as any)?.role === 'admin'
}

// DELETE /api/admin - Delete communities or content
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'community' or 'content'
    const id = searchParams.get('id')

    if (!type || !id) {
      return NextResponse.json(
        { error: 'Type and ID are required' },
        { status: 400 }
      )
    }

    const supabase = await createServerAuth()

    if (type === 'community') {
      // Check admin permissions
      const isAdmin = await checkAdminPermission(user)
      if (!isAdmin) {
        return NextResponse.json(
          { error: 'Admin permissions required' },
          { status: 403 }
        )
      }

      // Delete community and all related data
      const { error: deleteError } = await supabase
        .from('communities')
        .delete()
        .eq('id', id)

      if (deleteError) {
        console.error('Error deleting community:', deleteError)
        return NextResponse.json(
          { error: 'Failed to delete community' },
          { status: 500 }
        )
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Community deleted successfully' 
      })

    } else if (type === 'content') {
      // Get content to check community permissions
      const { data: content, error: contentError } = await supabase
        .from('community_content')
        .select('community_id')
        .eq('id', id)
        .single()

      if (contentError || !content) {
        return NextResponse.json(
          { error: 'Content not found' },
          { status: 404 }
        )
      }

      // Check if user is admin or community admin
      const isAdmin = await checkAdminPermission(user)
      const isCommunityAdmin = await checkCommunityAdminPermission(content.community_id, (user as any).id)

      if (!isAdmin && !isCommunityAdmin) {
        return NextResponse.json(
          { error: 'Admin or community admin permissions required' },
          { status: 403 }
        )
      }

      // Delete content
      const { error: deleteError } = await supabase
        .from('community_content')
        .delete()
        .eq('id', id)

      if (deleteError) {
        console.error('Error deleting content:', deleteError)
        return NextResponse.json(
          { error: 'Failed to delete content' },
          { status: 500 }
        )
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Content deleted successfully' 
      })

    } else {
      return NextResponse.json(
        { error: 'Invalid type. Must be "community" or "content"' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Admin deletion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/admin - Get admin dashboard data
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const isAdmin = await checkAdminPermission(user)
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin permissions required' },
        { status: 403 }
      )
    }

    const supabase = await createServerAuth()

    // Get admin dashboard data
    const [communitiesResult, contentResult, usersResult] = await Promise.all([
      supabase
        .from('communities')
        .select('id, name, slug, member_count, created_at, creator_id')
        .order('created_at', { ascending: false })
        .limit(50),
      
      supabase
        .from('community_content')
        .select('id, title, type, status, created_at, community_id, communities(name)')
        .order('created_at', { ascending: false })
        .limit(50),
      
      supabase
        .from('profiles')
        .select('id, email, full_name, user_type, created_at')
        .order('created_at', { ascending: false })
        .limit(50)
    ])

    if (communitiesResult.error) {
      console.error('Error fetching communities:', communitiesResult.error)
    }
    if (contentResult.error) {
      console.error('Error fetching content:', contentResult.error)
    }
    if (usersResult.error) {
      console.error('Error fetching users:', usersResult.error)
    }

    return NextResponse.json({
      communities: communitiesResult.data || [],
      content: contentResult.data || [],
      users: usersResult.data || []
    })

  } catch (error) {
    console.error('Admin dashboard error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
