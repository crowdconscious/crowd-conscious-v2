import { NextRequest, NextResponse } from 'next/server'
import { sendSponsorshipApproval } from '@/lib/email-sender'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      )
    }

    // Sample data for testing sponsorship approval
    const testData = {
      brandName: 'EcoTech Industries',
      needTitle: 'Solar Panel Installation for Community Center',
      communityName: 'Sustainable Downtown',
      fundingGoal: 15000,
      currentFunding: 8500,
      description: 'Help us install solar panels on our community center to reduce carbon footprint and create a sustainable energy source for local programs.',
      sponsorshipId: 'sp_test_123456789'
    }

    const result = await sendSponsorshipApproval(email, testData)

    if (result.success) {
      return NextResponse.json({ 
        message: 'Sponsorship approval email sent successfully!',
        details: 'Email includes payment button and impact preview'
      })
    } else {
      return NextResponse.json(
        { error: result.error || 'Failed to send sponsorship approval email' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Sponsorship approval test error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
