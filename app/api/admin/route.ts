import { NextRequest } from 'next/server'
import { createServerAuth, getCurrentUser } from '@/lib/auth-server'
import { ApiResponse } from '@/lib/api-responses'

async function checkAdminPermission(user: any): Promise<boolean> {
  if (!user) return false
  return user.user_type === 'admin'
}

// DELETE /api/admin - Legacy community/content delete removed
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return ApiResponse.unauthorized('Authentication required', 'AUTHENTICATION_REQUIRED')
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const id = searchParams.get('id')

    if (!type || !id) {
      return ApiResponse.badRequest('Type and ID are required', 'MISSING_REQUIRED_FIELDS')
    }

    if (type === 'community' || type === 'content') {
      return ApiResponse.badRequest('Community and content management removed. Tables were dropped.', 'LEGACY_FEATURE_REMOVED')
    }

    return ApiResponse.badRequest('Invalid type', 'INVALID_TYPE')
  } catch (error: any) {
    console.error('Admin deletion error:', error)
    return ApiResponse.serverError('Internal server error', 'ADMIN_DELETE_SERVER_ERROR', { message: error.message })
  }
}

// GET /api/admin - Get admin dashboard data (profiles only; communities/content removed)
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

    const { data: users } = await supabase
      .from('profiles')
      .select('id, full_name, user_type, created_at')
      .order('created_at', { ascending: false })
      .limit(50)

    return ApiResponse.ok({
      communities: [],
      content: [],
      users: users || []
    })
  } catch (error: any) {
    console.error('Admin dashboard error:', error)
    return ApiResponse.serverError('Internal server error', 'ADMIN_DASHBOARD_ERROR', { message: error.message })
  }
}
