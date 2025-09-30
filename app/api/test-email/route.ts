import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, sendWelcomeEmail, emailTemplates } from '@/lib/resend'

export async function POST(request: NextRequest) {
  try {
    const { type, email, name, testData } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      )
    }

    let result
    let emailType = type || 'welcome'

    switch (emailType) {
      case 'welcome':
        result = await sendWelcomeEmail(email, name || 'Test User', 'user')
        break
        
      case 'welcome-brand':
        result = await sendWelcomeEmail(email, name || 'Test Company', 'brand')
        break
        
      case 'custom':
        const customTemplate = {
          subject: 'Test Email from Crowd Conscious',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #14b8a6, #3b82f6); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">🧪 Email Test Successful!</h1>
              </div>
              <div style="padding: 30px 20px; background: #f8fafc; border-radius: 0 0 10px 10px;">
                <p style="color: #475569; line-height: 1.6;">
                  Congratulations! Your Resend email integration is working perfectly.
                </p>
                <p style="color: #475569; line-height: 1.6;">
                  <strong>Test Details:</strong><br>
                  • Sent to: ${email}<br>
                  • Timestamp: ${new Date().toISOString()}<br>
                  • Service: Resend API<br>
                  • Status: ✅ Delivered
                </p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.vercel.app'}" 
                     style="background: #14b8a6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                    Visit Crowd Conscious
                  </a>
                </div>
              </div>
            </div>
          `
        }
        result = await sendEmail(email, customTemplate)
        break
        
      case 'sponsorship':
        if (!testData) {
          return NextResponse.json(
            { error: 'Test data required for sponsorship email' },
            { status: 400 }
          )
        }
        const sponsorshipTemplate = emailTemplates.sponsorshipApproved(
          testData.brandName || 'Test Brand',
          testData.needTitle || 'Test Community Need',
          testData.amount || 1000,
          testData.communityName || 'Test Community',
          `${process.env.NEXT_PUBLIC_APP_URL}/brand/payment/test-id`
        )
        result = await sendEmail(email, sponsorshipTemplate)
        break
        
      default:
        return NextResponse.json(
          { error: 'Invalid email type. Use: welcome, welcome-brand, custom, sponsorship' },
          { status: 400 }
        )
    }

    if (result === true || (result && result.success)) {
      return NextResponse.json({
        success: true,
        message: `${emailType} email sent successfully to ${email}`,
        timestamp: new Date().toISOString()
      })
    } else {
      const errorMessage = (result && result.error) || 'Failed to send email'
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('Email test error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to show testing instructions
export async function GET() {
  return NextResponse.json({
    message: 'Email Testing Endpoint',
    usage: {
      method: 'POST',
      body: {
        type: 'welcome | welcome-brand | custom | sponsorship',
        email: 'your-email@example.com',
        name: 'Your Name (optional)',
        testData: {
          brandName: 'Test Brand (for sponsorship)',
          needTitle: 'Test Need (for sponsorship)', 
          amount: 1000,
          communityName: 'Test Community (for sponsorship)'
        }
      }
    },
    examples: [
      {
        description: 'Test welcome email',
        body: {
          type: 'welcome',
          email: 'your-email@example.com',
          name: 'John Doe'
        }
      },
      {
        description: 'Test custom email',
        body: {
          type: 'custom',
          email: 'your-email@example.com'
        }
      },
      {
        description: 'Test sponsorship email',
        body: {
          type: 'sponsorship',
          email: 'brand@example.com',
          testData: {
            brandName: 'EcoTech Solutions',
            needTitle: 'Community Garden Project',
            amount: 2500,
            communityName: 'Green Valley Community'
          }
        }
      }
    ]
  })
}
