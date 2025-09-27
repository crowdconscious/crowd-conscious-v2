import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { supabase } from '@/lib/supabase'
import { sendSponsorshipApprovalEmail } from '@/lib/email-simple'

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

    if ((sponsorship as any).status !== 'approved') {
      return NextResponse.json({ error: 'Sponsorship not approved' }, { status: 400 })
    }

    // Send approval email to brand
    const brandName = (sponsorship as any).profiles.company_name || (sponsorship as any).profiles.full_name
    const success = await sendSponsorshipApprovalEmail(
      (sponsorship as any).profiles.email,
      brandName,
      (sponsorship as any).community_content.title,
      (sponsorship as any).amount,
      (sponsorship as any).community_content.communities.name,
      (sponsorship as any).id
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
