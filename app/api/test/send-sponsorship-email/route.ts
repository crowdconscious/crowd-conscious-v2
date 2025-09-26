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
      .select('user_type')
      .eq('id', user.id)
      .single()

    if (!profile || profile.user_type !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { 
      email, 
      brandName, 
      needTitle, 
      amount, 
      communityName, 
      sponsorshipId 
    } = await request.json()

    if (!email || !brandName || !needTitle || !amount || !communityName) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    const success = await sendSponsorshipApprovalEmail(
      email,
      brandName,
      needTitle,
      parseFloat(amount),
      communityName,
      sponsorshipId || 'test-sponsorship-id'
    )

    if (!success) {
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: `Sponsorship approval email sent to ${email}`,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Test sponsorship email error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
