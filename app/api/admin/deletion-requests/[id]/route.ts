import { NextRequest, NextResponse } from 'next/server'
import { createServerAuth, getCurrentUser } from '@/lib/auth-server'

// Update deletion request (approve/reject)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id: requestId } = await params
    const { status, admin_notes } = await request.json()

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ 
        error: 'Status must be either "approved" or "rejected"' 
      }, { status: 400 })
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
      return NextResponse.json({ error: error.message }, { status: 500 })
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

        return NextResponse.json({ 
          error: 'Deletion request approved but deletion failed: ' + deletionError.message 
        }, { status: 500 })
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Deletion request ${status}`,
      data: updatedRequest 
    }, { status: 200 })

  } catch (error: any) {
    console.error('API error updating deletion request:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
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
  // Delete in order to respect foreign key constraints
  
  // 1. Delete community content
  await supabase.from('community_content').delete().eq('community_id', communityId)
  
  // 2. Delete community members
  await supabase.from('community_members').delete().eq('community_id', communityId)
  
  // 3. Delete the community
  const { error } = await supabase.from('communities').delete().eq('id', communityId)
  
  if (error) throw error

  // TODO: Add audit logging when audit_logs table is created
  console.log(`Community deleted: ${communityName} (ID: ${communityId}) by admin: ${adminId}`)
}

async function deleteUser(supabase: any, userId: string, userName: string, adminId: string) {
  // Delete user-related data
  
  // 1. Delete user's community memberships
  await supabase.from('community_members').delete().eq('user_id', userId)
  
  // 2. Delete user's content
  await supabase.from('community_content').delete().eq('created_by', userId)
  
  // 3. Delete user's comments
  await supabase.from('comments').delete().eq('user_id', userId)
  
  // 4. Delete user's votes
  await supabase.from('poll_votes').delete().eq('user_id', userId)
  
  // 5. Delete user's event registrations
  await supabase.from('event_registrations').delete().eq('user_id', userId)
  
  // 6. Delete user profile
  const { error } = await supabase.from('profiles').delete().eq('id', userId)
  
  if (error) throw error

  // Note: The actual auth user deletion should be done through Supabase Auth Admin API
  // This requires additional setup and is not included here for security reasons

  // TODO: Add audit logging when audit_logs table is created
  console.log(`User deleted: ${userName} (ID: ${userId}) by admin: ${adminId}`)
}

async function deleteContent(supabase: any, contentId: string, contentTitle: string, adminId: string) {
  // Delete content and related data
  
  // 1. Delete comments on this content
  await supabase.from('comments').delete().eq('content_id', contentId)
  
  // 2. Delete votes on this content
  await supabase.from('poll_votes').delete().eq('content_id', contentId)
  
  // 3. Delete event registrations for this content
  await supabase.from('event_registrations').delete().eq('content_id', contentId)
  
  // 4. Delete the content
  const { error } = await supabase.from('community_content').delete().eq('id', contentId)
  
  if (error) throw error

  // TODO: Add audit logging when audit_logs table is created
  console.log(`Content deleted: ${contentTitle} (ID: ${contentId}) by admin: ${adminId}`)
}
