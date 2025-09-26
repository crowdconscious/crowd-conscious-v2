import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { supabase } from '@/lib/supabase'
import { sendSponsorshipApprovalEmail } from '@/lib/resend'

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

    const { sponsorshipId, action, notes } = await request.json()

    if (!sponsorshipId || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
    }

    // Get sponsorship details for email
    const { data: sponsorship } = await supabase
      .from('sponsorships')
      .select(`
        id,
        amount,
        profiles:sponsor_id (
          email,
          full_name,
          company_name
        ),
        community_content (
          title,
          communities (
            name
          )
        )
      `)
      .eq('id', sponsorshipId)
      .single()

    // Update sponsorship status
    const { error: updateError } = await supabase
      .from('sponsorships')
      .update({
        status: action === 'approve' ? 'approved' : 'rejected',
        admin_notes: notes || null,
        requires_admin_review: false
      })
      .eq('id', sponsorshipId)

    if (updateError) {
      console.error('Error updating sponsorship:', updateError)
      return NextResponse.json({ error: 'Failed to update sponsorship' }, { status: 500 })
    }

    // Log admin action
    await supabase
      .from('admin_actions')
      .insert({
        admin_id: user.id,
        action_type: action === 'approve' ? 'approve_sponsorship' : 'reject_sponsorship',
        target_type: 'sponsorship',
        target_id: sponsorshipId,
        details: { notes }
      })

    // Send approval email if approved
    if (action === 'approve' && sponsorship) {
      const brandName = sponsorship.profiles.company_name || sponsorship.profiles.full_name
      await sendSponsorshipApprovalEmail(
        sponsorship.profiles.email,
        brandName,
        sponsorship.community_content.title,
        sponsorship.amount,
        sponsorship.community_content.communities.name,
        sponsorship.id
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Sponsorship moderation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
