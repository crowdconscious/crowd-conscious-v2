import { NextRequest, NextResponse } from 'next/server'
import { resend } from '@/lib/resend'

export async function GET(request: NextRequest) {
  try {
    // Check if Resend is configured
    if (!resend) {
      return NextResponse.json({ 
        success: false,
        error: 'Resend not configured',
        details: 'RESEND_API_KEY environment variable is not set',
        fix: 'Add RESEND_API_KEY to Vercel environment variables'
      }, { status: 500 })
    }

    // Check API key format
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey?.startsWith('re_')) {
      return NextResponse.json({
        success: false,
        error: 'Invalid API key format',
        details: 'RESEND_API_KEY should start with "re_"',
        currentKeyPrefix: apiKey?.substring(0, 3) || 'not set'
      }, { status: 500 })
    }

    // Get test email from query parameter
    const { searchParams } = new URL(request.url)
    const testEmail = searchParams.get('email') || 'test@example.com'

    // Send test email
    console.log('🔍 Sending test email to:', testEmail)
    console.log('🔍 From:', 'Crowd Conscious <comunidad@crowdconscious.app>')

    const { data, error } = await resend.emails.send({
      from: 'Crowd Conscious <comunidad@crowdconscious.app>',
      to: [testEmail],
      subject: 'Test Email from Crowd Conscious 📧',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc; border-radius: 10px;">
          <div style="background: linear-gradient(135deg, #14b8a6, #3b82f6); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">✅ Email System Working!</h1>
          </div>
          <div style="padding: 30px 20px; background: white; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1e293b; margin-top: 0;">Success!</h2>
            <p style="color: #475569; line-height: 1.6;">
              If you're reading this, your email system is configured correctly! 🎉
            </p>
            <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #14b8a6;">
              <p style="margin: 0; color: #475569;"><strong>From:</strong> comunidad@crowdconscious.app</p>
              <p style="margin: 8px 0 0 0; color: #475569;"><strong>To:</strong> ${testEmail}</p>
              <p style="margin: 8px 0 0 0; color: #475569;"><strong>Provider:</strong> Resend</p>
              <p style="margin: 8px 0 0 0; color: #475569;"><strong>Time:</strong> ${new Date().toISOString()}</p>
            </div>
            <h3 style="color: #1e293b;">What's Next?</h3>
            <ul style="color: #475569; line-height: 1.8;">
              <li>✅ Domain verified: crowdconscious.app</li>
              <li>✅ Sending email: comunidad@crowdconscious.app</li>
              <li>✅ All email templates ready</li>
              <li>✅ Welcome emails will send on signup</li>
              <li>✅ Sponsorship notifications will send</li>
              <li>✅ Monthly reports will send</li>
            </ul>
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://crowdconscious.app" style="background: #14b8a6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Visit Crowd Conscious</a>
            </div>
            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 20px;">
              This is a test email sent from your Crowd Conscious platform.
            </p>
          </div>
        </div>
      `
    })

    if (error) {
      console.error('❌ Resend error:', error)
      return NextResponse.json({
        success: false,
        error: error.message,
        errorName: error.name,
        details: error,
        troubleshooting: {
          'Domain not verified': 'Add DNS records in your domain registrar. Check Resend dashboard for exact records.',
          'Invalid API key': 'Check RESEND_API_KEY in Vercel environment variables',
          'Rate limit': 'You\'ve hit Resend\'s rate limit. Wait a few minutes and try again.',
          'Blocked': 'Email address is blocked. Try a different email.'
        }
      }, { status: 500 })
    }

    console.log('✅ Email sent successfully! ID:', data?.id)

    return NextResponse.json({ 
      success: true, 
      message: 'Email sent successfully!',
      emailId: data?.id,
      from: 'comunidad@crowdconscious.app',
      to: testEmail,
      timestamp: new Date().toISOString(),
      nextSteps: [
        'Check your inbox (and spam folder)',
        'Check Resend dashboard logs: https://resend.com/emails',
        'If email not received, check DNS records',
        'All automated emails will now work!'
      ]
    })
  } catch (error: any) {
    console.error('❌ Unexpected error:', error)
    return NextResponse.json({ 
      success: false,
      error: error.message,
      stack: error.stack,
      type: 'Unexpected error'
    }, { status: 500 })
  }
}

