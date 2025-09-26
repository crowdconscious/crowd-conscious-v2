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

    const { sponsorshipId } = await request.json()

    if (!sponsorshipId) {
      return NextResponse.json({ error: 'Sponsorship ID is required' }, { status: 400 })
    }

    // Get sponsorship details with related data
    const { data: sponsorship, error } = await supabase
      .from('sponsorships')
      .select(`
        id,
        amount,
        status,
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

    if (error || !sponsorship) {
      return NextResponse.json({ error: 'Sponsorship not found' }, { status: 404 })
    }

    if (sponsorship.status !== 'approved') {
      return NextResponse.json({ error: 'Sponsorship not approved' }, { status: 400 })
    }

    // Send approval email to brand
    const brandName = sponsorship.profiles.company_name || sponsorship.profiles.full_name
    const success = await sendSponsorshipApprovalEmail(
      sponsorship.profiles.email,
      brandName,
      sponsorship.community_content.title,
      sponsorship.amount,
      sponsorship.community_content.communities.name,
      sponsorship.id
    )

    if (!success) {
      return NextResponse.json({ error: 'Failed to send approval email' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Sponsorship approval email error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
