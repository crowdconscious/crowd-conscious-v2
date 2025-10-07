import { NextResponse } from 'next/server'

export async function GET() {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    checks: {} as Record<string, any>
  }

  // Check 1: RESEND_API_KEY exists
  diagnostics.checks.resendApiKey = {
    exists: !!process.env.RESEND_API_KEY,
    prefix: process.env.RESEND_API_KEY?.substring(0, 7) || 'NOT_SET',
    valid: process.env.RESEND_API_KEY?.startsWith('re_') || false
  }

  // Check 2: Try to import resend
  try {
    const { resend } = await import('@/lib/resend')
    diagnostics.checks.resendImport = {
      success: true,
      configured: !!resend,
      clientExists: resend !== null
    }

    // Check 3: Try to send a test email
    if (resend) {
      try {
        const { data, error } = await resend.emails.send({
          from: 'Crowd Conscious <comunidad@crowdconscious.app>',
          to: ['delivered@resend.dev'], // Resend's test email
          subject: 'Diagnostic Test Email',
          html: '<p>This is a diagnostic test from Crowd Conscious</p>'
        })

        if (error) {
          diagnostics.checks.emailSend = {
            success: false,
            error: error.message,
            errorName: error.name,
            errorDetails: error
          }
        } else {
          diagnostics.checks.emailSend = {
            success: true,
            emailId: data?.id,
            message: 'Email sent successfully to Resend test address'
          }
        }
      } catch (sendError: any) {
        diagnostics.checks.emailSend = {
          success: false,
          error: sendError.message,
          stack: sendError.stack
        }
      }
    } else {
      diagnostics.checks.emailSend = {
        success: false,
        error: 'Resend client is null - API key not configured'
      }
    }
  } catch (importError: any) {
    diagnostics.checks.resendImport = {
      success: false,
      error: importError.message,
      stack: importError.stack
    }
  }

  // Check 4: Verify FROM email configuration
  try {
    const resendModule = await import('@/lib/resend')
    diagnostics.checks.configuration = {
      fromEmail: 'comunidad@crowdconscious.app',
      configured: true
    }
  } catch (error: any) {
    diagnostics.checks.configuration = {
      error: error.message
    }
  }

  return NextResponse.json(diagnostics, { 
    status: diagnostics.checks.emailSend?.success ? 200 : 500 
  })
}

