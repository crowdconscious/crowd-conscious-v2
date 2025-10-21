import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/resend'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      email,
      supportType,
      contentTitle,
      communityName,
      displayName,
      amount,
      skills,
      resources
    } = body

    if (!email || !supportType || !contentTitle) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create email template based on support type
    let emailTemplate

    if (supportType === 'financial') {
      emailTemplate = {
        subject: `Thank you for your sponsorship! 💰`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #10b981, #14b8a6); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Thank You! 💰</h1>
            </div>
            <div style="padding: 30px 20px; background: #f8fafc; border-radius: 0 0 10px 10px;">
              <p style="color: #475569; line-height: 1.6;">Hi ${displayName || 'there'}!</p>
              <p style="color: #475569; line-height: 1.6;">
                Thank you for your generous sponsorship of <strong>$${amount?.toLocaleString()} MXN</strong> for <strong>"${contentTitle}"</strong> in the ${communityName} community!
              </p>
              
              <div style="background: white; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #10b981;">
                <h3 style="margin-top: 0; color: #1e293b;">🎯 Your Impact:</h3>
                <p style="margin: 10px 0; color: #475569;">Your sponsorship is making real change happen! The community will use these funds to bring this need to life.</p>
                <p style="margin: 10px 0; color: #475569;"><strong>Need:</strong> ${contentTitle}</p>
                <p style="margin: 10px 0; color: #475569;"><strong>Community:</strong> ${communityName}</p>
                <p style="margin: 10px 0; color: #10b981; font-weight: bold;"><strong>Your Contribution:</strong> $${amount?.toLocaleString()} MXN</p>
              </div>
              
              <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                  <strong>✨ What's Next:</strong> Complete your payment to finalize your sponsorship. The community will be notified and you'll receive impact updates!
                </p>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 20px;">
                Questions? Contact us at <a href="mailto:comunidad@crowdconscious.app" style="color: #14b8a6;">comunidad@crowdconscious.app</a>
              </p>
            </div>
          </div>
        `
      }
    } else if (supportType === 'volunteer') {
      emailTemplate = {
        subject: `Thank you for volunteering! 🙋`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #0ea5e9, #14b8a6); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Welcome Volunteer! 🙋</h1>
            </div>
            <div style="padding: 30px 20px; background: #f8fafc; border-radius: 0 0 10px 10px;">
              <p style="color: #475569; line-height: 1.6;">Hi ${displayName || 'there'}!</p>
              <p style="color: #475569; line-height: 1.6;">
                Thank you for offering to volunteer your time and skills for <strong>"${contentTitle}"</strong> in the ${communityName} community!
              </p>
              
              <div style="background: white; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #0ea5e9;">
                <h3 style="margin-top: 0; color: #1e293b;">🛠️ Your Skills:</h3>
                <p style="margin: 10px 0; color: #475569; font-style: italic;">"${skills}"</p>
                <p style="margin: 15px 0; color: #475569;"><strong>Need:</strong> ${contentTitle}</p>
                <p style="margin: 10px 0; color: #475569;"><strong>Community:</strong> ${communityName}</p>
              </div>
              
              <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #1e40af; font-size: 14px;">
                  <strong>✨ What's Next:</strong> The community organizers will review your offer and reach out to coordinate how you can help. Thank you for giving your time!
                </p>
              </div>
              
              <p style="color: #475569; line-height: 1.6;">
                Your willingness to help makes all the difference. Together, we're building stronger communities!
              </p>
              
              <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 20px;">
                Questions? Contact us at <a href="mailto:comunidad@crowdconscious.app" style="color: #14b8a6;">comunidad@crowdconscious.app</a>
              </p>
            </div>
          </div>
        `
      }
    } else if (supportType === 'resources') {
      emailTemplate = {
        subject: `Thank you for your resource donation! 📦`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #a855f7, #14b8a6); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Thank You! 📦</h1>
            </div>
            <div style="padding: 30px 20px; background: #f8fafc; border-radius: 0 0 10px 10px;">
              <p style="color: #475569; line-height: 1.6;">Hi ${displayName || 'there'}!</p>
              <p style="color: #475569; line-height: 1.6;">
                Thank you for offering to provide resources for <strong>"${contentTitle}"</strong> in the ${communityName} community!
              </p>
              
              <div style="background: white; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #a855f7;">
                <h3 style="margin-top: 0; color: #1e293b;">📦 Your Resources:</h3>
                <p style="margin: 10px 0; color: #475569; font-style: italic;">"${resources}"</p>
                <p style="margin: 15px 0; color: #475569;"><strong>Need:</strong> ${contentTitle}</p>
                <p style="margin: 10px 0; color: #475569;"><strong>Community:</strong> ${communityName}</p>
              </div>
              
              <div style="background: #f3e8ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #6b21a8; font-size: 14px;">
                  <strong>✨ What's Next:</strong> The community organizers will review your resource offer and contact you to arrange pickup or delivery. Your generosity is amazing!
                </p>
              </div>
              
              <p style="color: #475569; line-height: 1.6;">
                Material support like yours helps communities take immediate action. Thank you for making a tangible difference!
              </p>
              
              <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 20px;">
                Questions? Contact us at <a href="mailto:comunidad@crowdconscious.app" style="color: #14b8a6;">comunidad@crowdconscious.app</a>
              </p>
            </div>
          </div>
        `
      }
    }

    // Send the email
    const result = await sendEmail(email, emailTemplate!)

    if (!result.success) {
      console.error('Failed to send email:', result.error)
      return NextResponse.json(
        { error: 'Failed to send confirmation email' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Confirmation email sent'
    })

  } catch (error: any) {
    console.error('Support confirmation email error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

