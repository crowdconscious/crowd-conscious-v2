import { NextRequest, NextResponse } from 'next/server'
import { resend } from '@/lib/resend'

export async function GET() {
  try {
    // Check environment variables
    const envCheck = {
      RESEND_API_KEY: !!process.env.RESEND_API_KEY,
      RESEND_API_KEY_LENGTH: process.env.RESEND_API_KEY?.length || 0,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NODE_ENV: process.env.NODE_ENV
    }

    // Check Resend instance
    const resendCheck = {
      resend_instance_exists: !!resend,
      resend_type: typeof resend
    }

    // Try to get domains (if Resend is configured)
    let domainsCheck = null
    if (resend) {
      try {
        const domains = await resend.domains.list()
        domainsCheck = {
          success: true,
          domains_count: Array.isArray(domains.data) ? domains.data.length : 0,
          domains: domains.data
        }
      } catch (error: any) {
        domainsCheck = {
          success: false,
          error: error.message
        }
      }
    }

    // Try a simple email send test
    let emailTest = null
    if (resend) {
      try {
        const testResult = await resend.emails.send({
          from: 'Crowd Conscious <onboarding@resend.dev>',
          to: ['test@example.com'], // This will fail but we can see the error
          subject: 'Debug Test Email',
          html: '<p>This is a debug test email</p>'
        })
        emailTest = {
          success: true,
          result: testResult
        }
      } catch (error: any) {
        emailTest = {
          success: false,
          error: error.message,
          error_code: error.code || 'unknown'
        }
      }
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: envCheck,
      resend: resendCheck,
      domains: domainsCheck,
      email_test: emailTest
    }, { status: 200 })

  } catch (error: any) {
    console.error('Debug email error:', error)
    return NextResponse.json({
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json({ error: 'Email address required' }, { status: 400 })
    }

    if (!resend) {
      return NextResponse.json({ error: 'Resend not configured' }, { status: 500 })
    }

    // Try to send a real test email
    const result = await resend.emails.send({
      from: 'Crowd Conscious <onboarding@resend.dev>',
      to: [email],
      subject: 'Debug Test Email from Crowd Conscious',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #14b8a6;">🔧 Debug Test Email</h1>
          <p>This is a debug test email from your Crowd Conscious platform.</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p><strong>Sent to:</strong> ${email}</p>
          <p>If you received this email, your email system is working correctly!</p>
        </div>
      `
    })

    return NextResponse.json({
      success: true,
      message: `Debug email sent successfully to ${email}`,
      result: result
    }, { status: 200 })

  } catch (error: any) {
    console.error('Debug email send error:', error)
    return NextResponse.json({
      error: error.message || 'Failed to send debug email',
      error_code: error.code || 'unknown'
    }, { status: 500 })
  }
}
