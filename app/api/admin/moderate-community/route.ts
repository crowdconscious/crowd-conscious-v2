import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type, suspended')
      .eq('id', user.id)
      .single()

    if (!profile || profile.user_type !== 'admin' || profile.suspended) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { communityId, action, notes } = await request.json()

    if (!communityId || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
    }

    // Update community moderation status
    const { error: updateError } = await supabase
      .from('communities')
      .update({
        moderation_status: action === 'approve' ? 'approved' : 'rejected',
        moderated_by: user.id,
        moderated_at: new Date().toISOString(),
        moderation_notes: notes || null
      })
      .eq('id', communityId)

    if (updateError) {
      console.error('Error updating community:', updateError)
      return NextResponse.json({ error: 'Failed to update community' }, { status: 500 })
    }

    // Log admin action
    await supabase
      .from('admin_actions')
      .insert({
        admin_id: user.id,
        action_type: action === 'approve' ? 'approve_community' : 'reject_community',
        target_type: 'community',
        target_id: communityId,
        details: { notes }
      })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Community moderation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
