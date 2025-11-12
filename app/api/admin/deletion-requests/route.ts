import { NextRequest } from 'next/server'
import { createServerAuth, getCurrentUser } from '@/lib/auth-server'
import { ApiResponse } from '@/lib/api-responses'

// Get all deletion requests (admin only)
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return ApiResponse.unauthorized('Authentication required', 'AUTHENTICATION_REQUIRED')
    }

    const supabase = await createServerAuth()

    // Check if user is admin
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('user_type')
      .eq('id', (user as any).id)
      .single()

    if ((profile as any)?.user_type !== 'admin') {
      return ApiResponse.forbidden('Admin access required', 'NOT_ADMIN')
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
      return ApiResponse.serverError('Failed to fetch deletion requests', 'DELETION_REQUESTS_FETCH_ERROR', { message: error.message })
    }

    return ApiResponse.ok({ data: requests })

  } catch (error: any) {
    console.error('API error fetching deletion requests:', error)
    return ApiResponse.serverError('Internal server error', 'DELETION_REQUESTS_SERVER_ERROR', { message: error.message })
  }
}

// Create deletion request
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return ApiResponse.unauthorized('Authentication required', 'AUTHENTICATION_REQUIRED')
    }

    const { request_type, target_id, target_name, reason } = await request.json()

    if (!request_type || !target_id || !target_name) {
      return ApiResponse.badRequest('Missing required fields: request_type, target_id, target_name', 'MISSING_REQUIRED_FIELDS')
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
          return ApiResponse.forbidden('Only community founders or admins can request community deletion', 'INSUFFICIENT_PERMISSIONS')
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
        return ApiResponse.forbidden('Only admins can request user or content deletion', 'INSUFFICIENT_PERMISSIONS')
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
      return ApiResponse.serverError('Failed to create deletion request', 'DELETION_REQUEST_CREATION_ERROR', { message: error.message })
    }

    return ApiResponse.created({ 
      message: 'Deletion request created successfully',
      data: deletionRequest 
    })

  } catch (error: any) {
    console.error('API error creating deletion request:', error)
    return ApiResponse.serverError('Internal server error', 'DELETION_REQUEST_SERVER_ERROR', { message: error.message })
  }
}
