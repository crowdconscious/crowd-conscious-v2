import { NextRequest } from 'next/server'
import { createServerAuth, getCurrentUser } from '@/lib/auth-server'
import { ApiResponse } from '@/lib/api-responses'

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
      return ApiResponse.unauthorized('Authentication required', 'AUTHENTICATION_REQUIRED')
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'community' or 'content'
    const id = searchParams.get('id')

    if (!type || !id) {
      return ApiResponse.badRequest('Type and ID are required', 'MISSING_REQUIRED_FIELDS')
    }

    const supabase = await createServerAuth()

    if (type === 'community') {
      // Check admin permissions
      const isAdmin = await checkAdminPermission(user)
      console.log('🔍 Delete community - Admin check:', { 
        userId: (user as any).id, 
        userType: (user as any).user_type,
        isAdmin 
      })
      
      if (!isAdmin) {
        return ApiResponse.forbidden('Admin permissions required. Your user_type must be "admin".', 'NOT_ADMIN')
      }

      // Delete community and all related data
      console.log('🗑️ Attempting to delete community:', id)
      const { error: deleteError, data } = await supabase
        .from('communities')
        .delete()
        .eq('id', id)
        .select()

      if (deleteError) {
        console.error('❌ Error deleting community:', deleteError)
        return ApiResponse.serverError('Failed to delete community', 'COMMUNITY_DELETE_ERROR', { message: deleteError.message })
      }

      console.log('✅ Community deleted successfully:', data)
      return ApiResponse.ok({ 
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
        return ApiResponse.notFound('Content', 'CONTENT_NOT_FOUND')
      }

      // Check if user is admin or community admin
      const isAdmin = await checkAdminPermission(user)
      const isCommunityAdmin = await checkCommunityAdminPermission(content.community_id, (user as any).id)
      
      console.log('🔍 Delete content - Permission check:', { 
        userId: (user as any).id,
        userType: (user as any).user_type,
        contentId: id,
        communityId: content.community_id,
        isAdmin,
        isCommunityAdmin
      })

      if (!isAdmin && !isCommunityAdmin) {
        return ApiResponse.forbidden('Admin or community admin permissions required', 'INSUFFICIENT_PERMISSIONS')
      }

      // Delete content
      console.log('🗑️ Attempting to delete content:', id)
      const { error: deleteError, data } = await supabase
        .from('community_content')
        .delete()
        .eq('id', id)
        .select()

      if (deleteError) {
        console.error('❌ Error deleting content:', deleteError)
        return ApiResponse.serverError('Failed to delete content', 'CONTENT_DELETE_ERROR', { message: deleteError.message })
      }

      console.log('✅ Content deleted successfully:', data)
      return ApiResponse.ok({ 
        message: 'Content deleted successfully' 
      })

    } else {
      return ApiResponse.badRequest('Invalid type. Must be "community" or "content"', 'INVALID_TYPE')
    }

  } catch (error: any) {
    console.error('Admin deletion error:', error)
    return ApiResponse.serverError('Internal server error', 'ADMIN_DELETE_SERVER_ERROR', { message: error.message })
  }
}

// GET /api/admin - Get admin dashboard data
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return ApiResponse.unauthorized('Authentication required', 'AUTHENTICATION_REQUIRED')
    }

    const isAdmin = await checkAdminPermission(user)
    if (!isAdmin) {
      return ApiResponse.forbidden('Admin permissions required', 'NOT_ADMIN')
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
        .select('id, full_name, user_type, created_at')
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

    return ApiResponse.ok({
      communities: communitiesResult.data || [],
      content: contentResult.data || [],
      users: usersResult.data || []
    })

  } catch (error: any) {
    console.error('Admin dashboard error:', error)
    return ApiResponse.serverError('Internal server error', 'ADMIN_DASHBOARD_ERROR', { message: error.message })
  }
}
