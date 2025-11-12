import { NextRequest } from 'next/server'
import { ApiResponse } from '@/lib/api-responses'
import { sendEmail, emailTemplates, sendWelcomeEmail, sendSponsorshipApprovalEmail } from '@/lib/resend'

// Test email endpoint
export async function POST(request: NextRequest) {
  try {
    const { type, email, name, testData } = await request.json()

    if (!email) {
      return ApiResponse.badRequest('Email is required', 'MISSING_EMAIL')
    }

    let result: { success: boolean; error?: string }

    switch (type) {
      case 'welcome':
        const welcomeSuccess = await sendWelcomeEmail(email, name || 'Test User')
        result = { success: welcomeSuccess }
        break

      case 'welcome-brand':
        // Brand welcome removed - redirect to regular welcome
        const brandSuccess = await sendWelcomeEmail(email, name || 'Test Company')
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
        return ApiResponse.badRequest('Invalid email type. Use: welcome, welcome-brand, sponsorship, or custom', 'INVALID_EMAIL_TYPE')
    }

    if (result.success) {
      return ApiResponse.ok({
        message: `${type} email sent successfully to ${email}`,
        timestamp: new Date().toISOString()
      })
    } else {
      return ApiResponse.serverError(result.error || 'Failed to send email', 'EMAIL_SEND_ERROR')
    }

  } catch (error: any) {
    console.error('Email test error:', error)
    return ApiResponse.serverError('Internal server error', 'EMAIL_TEST_SERVER_ERROR', { message: error.message })
  }
}

// Get email system status
export async function GET() {
  try {
    const hasResendKey = !!process.env.RESEND_API_KEY
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    return ApiResponse.ok({
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
  } catch (error: any) {
    console.error('Email status error:', error)
    return ApiResponse.serverError('Failed to get email status', 'EMAIL_STATUS_ERROR', { message: error.message })
  }
}