import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, emailTemplates, sendWelcomeEmail, sendSponsorshipApprovalEmail } from '@/lib/resend'

// Test email endpoint
export async function POST(request: NextRequest) {
  try {
    const { type, email, name, testData } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    let result: { success: boolean; error?: string }

    switch (type) {
      case 'welcome':
        const welcomeSuccess = await sendWelcomeEmail(email, name || 'Test User', 'user')
        result = { success: welcomeSuccess }
        break

      case 'welcome-brand':
        const brandSuccess = await sendWelcomeEmail(email, name || 'Test Company', 'brand')
        result = { success: brandSuccess }
        break

      case 'sponsorship':
        const sponsorshipData = testData || {
          brandName: 'EcoTech Solutions',
          needTitle: 'Community Garden Project',
          amount: 2500,
          communityName: 'Green Valley Community'
        }
        const sponsorshipSuccess = await sendSponsorshipApprovalEmail(
          email,
          sponsorshipData.brandName,
          sponsorshipData.needTitle,
          sponsorshipData.amount,
          sponsorshipData.communityName,
          'test-sponsorship-id'
        )
        result = { success: sponsorshipSuccess }
        break

      case 'custom':
        const customTemplate = {
          subject: 'Test Email from Crowd Conscious',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #14b8a6;">Test Email</h1>
              <p>This is a test email to verify the email system is working correctly.</p>
              <p>If you received this email, the system is functioning properly!</p>
              <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #0369a1;"><strong>✅ Email System Status: Working</strong></p>
              </div>
            </div>
          `
        }
        result = await sendEmail(email, customTemplate)
        break

      default:
        return NextResponse.json(
          { error: 'Invalid email type. Use: welcome, welcome-brand, sponsorship, or custom' },
          { status: 400 }
        )
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `${type} email sent successfully to ${email}`,
        timestamp: new Date().toISOString()
      })
    } else {
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Email test error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get email system status
export async function GET() {
  try {
    const hasResendKey = !!process.env.RESEND_API_KEY
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    return NextResponse.json({
      emailSystem: {
        configured: hasResendKey,
        service: 'Resend',
        appUrl,
        templates: [
          'welcome',
          'welcome-brand', 
          'sponsorship',
          'custom'
        ]
      },
      instructions: {
        testWelcome: 'POST with { "type": "welcome", "email": "your@email.com", "name": "Your Name" }',
        testBrand: 'POST with { "type": "welcome-brand", "email": "your@email.com", "name": "Company Name" }',
        testSponsorship: 'POST with { "type": "sponsorship", "email": "your@email.com", "testData": {...} }',
        testCustom: 'POST with { "type": "custom", "email": "your@email.com" }'
      }
    })
  } catch (error) {
    console.error('Email status error:', error)
    return NextResponse.json(
      { error: 'Failed to get email status' },
      { status: 500 }
    )
  }
}