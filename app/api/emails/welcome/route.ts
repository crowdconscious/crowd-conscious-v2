import { NextRequest } from 'next/server'
import { ApiResponse } from '@/lib/api-responses'
import { sendWelcomeEmail } from '@/lib/resend'

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json()

    if (!email || !name) {
      return ApiResponse.badRequest('Email and name are required', 'MISSING_REQUIRED_FIELDS')
    }

    const success = await sendWelcomeEmail(email, name)

    if (!success) {
      return ApiResponse.serverError('Failed to send welcome email', 'WELCOME_EMAIL_ERROR')
    }

    return ApiResponse.ok({ message: 'Welcome email sent successfully' })
  } catch (error: any) {
    console.error('Welcome email error:', error)
    return ApiResponse.serverError('Internal server error', 'WELCOME_EMAIL_SERVER_ERROR', { message: error.message })
  }
}
