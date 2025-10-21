import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/resend'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      email,
      name,
      responseType, // 'poll_vote', 'event_rsvp', 'need_support'
      contentTitle,
      contentType, // 'poll', 'event', 'need'
      pollOption, // For polls
      eventDate, // For events
      eventLocation, // For events
      supportType // For needs: 'volunteer', 'financial', 'resources'
    } = body

    if (!email || !responseType || !contentTitle) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    let emailTemplate

    // Poll Vote Confirmation
    if (responseType === 'poll_vote') {
      emailTemplate = {
        subject: `Your vote has been recorded! 🗳️`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #6366f1, #14b8a6); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Vote Recorded! 🗳️</h1>
            </div>
            <div style="padding: 30px 20px; background: #f8fafc; border-radius: 0 0 10px 10px;">
              <p style="color: #475569; line-height: 1.6;">Hi ${name || 'there'}!</p>
              <p style="color: #475569; line-height: 1.6;">
                Thank you for voting on <strong>"${contentTitle}"</strong>! Your voice matters in shaping community decisions.
              </p>
              
              <div style="background: white; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #6366f1;">
                <h3 style="margin-top: 0; color: #1e293b;">Your Vote:</h3>
                <p style="margin: 10px 0; color: #475569;"><strong>Poll:</strong> ${contentTitle}</p>
                ${pollOption ? `<p style="margin: 10px 0; color: #475569;"><strong>Your Choice:</strong> ${pollOption}</p>` : ''}
              </div>
              
              <div style="background: #e0e7ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #3730a3; font-size: 14px;">
                  <strong>💡 Want to do more?</strong> Join Crowd Conscious to create your own polls, join communities, and make a bigger impact!
                </p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/signup" style="background: #6366f1; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.3);">🚀 Join Crowd Conscious</a>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 20px;">
                Questions? Contact us at <a href="mailto:comunidad@crowdconscious.app" style="color: #14b8a6;">comunidad@crowdconscious.app</a>
              </p>
            </div>
          </div>
        `
      }
    }

    // Event RSVP Confirmation
    else if (responseType === 'event_rsvp') {
      emailTemplate = {
        subject: `You're registered for ${contentTitle}! 📅`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #f59e0b, #14b8a6); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">You're All Set! 🎉</h1>
            </div>
            <div style="padding: 30px 20px; background: #f8fafc; border-radius: 0 0 10px 10px;">
              <p style="color: #475569; line-height: 1.6;">Hi ${name || 'there'}!</p>
              <p style="color: #475569; line-height: 1.6;">
                Great news! You're registered for <strong>"${contentTitle}"</strong>. We're excited to have you join us!
              </p>
              
              <div style="background: white; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #f59e0b;">
                <h3 style="margin-top: 0; color: #1e293b;">📅 Event Details:</h3>
                <p style="margin: 10px 0; color: #475569;"><strong>Event:</strong> ${contentTitle}</p>
                ${eventDate ? `<p style="margin: 10px 0; color: #475569;"><strong>Date:</strong> ${eventDate}</p>` : ''}
                ${eventLocation ? `<p style="margin: 10px 0; color: #475569;"><strong>Location:</strong> ${eventLocation}</p>` : ''}
              </div>
              
              <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                  <strong>💡 Tip:</strong> Add this event to your calendar! The organizers will reach out with more details closer to the date.
                </p>
              </div>
              
              <div style="background: #e0e7ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #3730a3; font-size: 14px;">
                  <strong>💡 Join the community!</strong> Sign up for Crowd Conscious to stay updated on all events and connect with other attendees.
                </p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/signup" style="background: #f59e0b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.3);">🚀 Join Crowd Conscious</a>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 20px;">
                Questions? Contact us at <a href="mailto:comunidad@crowdconscious.app" style="color: #14b8a6;">comunidad@crowdconscious.app</a>
              </p>
            </div>
          </div>
        `
      }
    }

    // Need Support Confirmation
    else if (responseType === 'need_support') {
      const supportEmoji = supportType === 'financial' ? '💰' : supportType === 'volunteer' ? '🙋' : '📦'
      const supportText = supportType === 'financial' ? 'financial support' : supportType === 'volunteer' ? 'volunteer time' : 'resources'
      
      emailTemplate = {
        subject: `Thank you for offering support! ${supportEmoji}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #10b981, #14b8a6); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Thank You! ${supportEmoji}</h1>
            </div>
            <div style="padding: 30px 20px; background: #f8fafc; border-radius: 0 0 10px 10px;">
              <p style="color: #475569; line-height: 1.6;">Hi ${name || 'there'}!</p>
              <p style="color: #475569; line-height: 1.6;">
                Thank you for offering to provide ${supportText} for <strong>"${contentTitle}"</strong>! Your generosity makes real change possible.
              </p>
              
              <div style="background: white; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #10b981;">
                <h3 style="margin-top: 0; color: #1e293b;">Your Offer:</h3>
                <p style="margin: 10px 0; color: #475569;"><strong>Need:</strong> ${contentTitle}</p>
                <p style="margin: 10px 0; color: #475569;"><strong>Support Type:</strong> ${supportText}</p>
              </div>
              
              <div style="background: #d1fae5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #065f46; font-size: 14px;">
                  <strong>✨ What's Next:</strong> The community organizers will review your offer and reach out to coordinate. Thank you for your support!
                </p>
              </div>
              
              <div style="background: #e0e7ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #3730a3; font-size: 14px;">
                  <strong>💡 Want to see your impact?</strong> Join Crowd Conscious to track how your contributions are making a difference!
                </p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/signup" style="background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);">🚀 Join Crowd Conscious</a>
              </div>
              
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
    console.error('External response confirmation email error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

