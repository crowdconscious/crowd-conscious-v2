import { NextRequest, NextResponse } from 'next/server'
import { sendWelcomeEmail } from '@/lib/email-simple'

export async function POST(request: NextRequest) {
  try {
    const { email, name, userType } = await request.json()

    if (!email || !name) {
      return NextResponse.json({ error: 'Email and name are required' }, { status: 400 })
    }

    const success = await sendWelcomeEmail(email, name, userType)

    if (!success) {
      return NextResponse.json({ error: 'Failed to send welcome email' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Welcome email error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
