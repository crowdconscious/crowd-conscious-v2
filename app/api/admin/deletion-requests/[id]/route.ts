import { NextRequest } from 'next/server'
import { createServerAuth, getCurrentUser } from '@/lib/auth-server'
import { ApiResponse } from '@/lib/api-responses'

// Update deletion request (approve/reject)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return ApiResponse.unauthorized('Authentication required', 'AUTHENTICATION_REQUIRED')
    }

    const { id: requestId } = await params
    const { status, admin_notes } = await request.json()

    if (!['approved', 'rejected'].includes(status)) {
      return ApiResponse.badRequest('Status must be either "approved" or "rejected"', 'INVALID_STATUS')
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

    // Update deletion request
    const { data: updatedRequest, error } = await (supabase as any)
      .from('deletion_requests')
      .update({
        status,
        admin_notes,
        reviewed_by: (user as any).id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select()
      .single()

    if (error) {
      console.error('Error updating deletion request:', error)
      return ApiResponse.serverError('Failed to update deletion request', 'DELETION_REQUEST_UPDATE_ERROR', { message: error.message })
    }

    // If approved, perform the actual deletion
    if (status === 'approved') {
      try {
        await performDeletion(supabase, updatedRequest, (user as any).id)
        
        // Update status to completed
        await (supabase as any)
          .from('deletion_requests')
          .update({ status: 'completed' })
          .eq('id', requestId)

      } catch (deletionError: any) {
        console.error('Error performing deletion:', deletionError)
        
        // Update request with error info
        await (supabase as any)
          .from('deletion_requests')
          .update({ 
            admin_notes: `${admin_notes || ''}\n\nDeletion failed: ${deletionError.message}` 
          })
          .eq('id', requestId)

        return ApiResponse.serverError('Deletion request approved but deletion failed', 'DELETION_EXECUTION_ERROR', { message: deletionError.message })
      }
    }

    return ApiResponse.ok({ 
      message: `Deletion request ${status}`,
      data: updatedRequest 
    })

  } catch (error: any) {
    console.error('API error updating deletion request:', error)
    return ApiResponse.serverError('Internal server error', 'DELETION_REQUEST_SERVER_ERROR', { message: error.message })
  }
}

// Perform the actual deletion based on request type
async function performDeletion(supabase: any, request: any, adminId: string) {
  const { request_type, target_id, target_name } = request

  switch (request_type) {
    case 'community':
      await deleteCommunity(supabase, target_id, target_name, adminId)
      break
    case 'user':
      await deleteUser(supabase, target_id, target_name, adminId)
      break
    case 'content':
      await deleteContent(supabase, target_id, target_name, adminId)
      break
    default:
      throw new Error(`Unknown request type: ${request_type}`)
  }
}

async function deleteCommunity(supabase: any, communityId: string, communityName: string, adminId: string) {
  throw new Error('Community deletion no longer supported. Communities table was removed.')
}

async function deleteUser(supabase: any, userId: string, userName: string, adminId: string) {
  // Legacy tables (community_members, community_content, poll_votes, event_registrations) removed
  await supabase.from('comments').delete().eq('user_id', userId)

  const { error } = await supabase.from('profiles').delete().eq('id', userId)
  if (error) throw error

  // Note: Auth user deletion should be done via Supabase Auth Admin API
  console.log(`User deleted: ${userName} (ID: ${userId}) by admin: ${adminId}`)
}

async function deleteContent(supabase: any, contentId: string, contentTitle: string, adminId: string) {
  throw new Error('Content deletion no longer supported. Community content table was removed.')
}
