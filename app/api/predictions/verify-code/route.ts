import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  strictRateLimit,
  getRateLimitIdentifier,
  checkRateLimit,
  rateLimitResponse,
} from '@/lib/rate-limit'

const COOKIE_NAME = 'predictions_access'
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 // 30 days in seconds

export async function POST(request: Request) {
  try {
    // Rate limit: 5 attempts per minute
    const identifier = await getRateLimitIdentifier(request)
    const limitResult = await checkRateLimit(strictRateLimit, identifier)

    if (limitResult && !limitResult.allowed) {
      return rateLimitResponse(
        limitResult.limit,
        limitResult.remaining,
        limitResult.reset
      )
    }

    const body = await request.json()
    const code = typeof body?.code === 'string' ? body.code.trim() : ''

    const expectedCode = process.env.PREDICTIONS_ACCESS_CODE

    if (!expectedCode) {
      console.error('PREDICTIONS_ACCESS_CODE is not configured')
      return NextResponse.json(
        { success: false, error: 'Invalid code' },
        { status: 401 }
      )
    }

    if (code !== expectedCode) {
      return NextResponse.json(
        { success: false, error: 'Invalid access code' },
        { status: 401 }
      )
    }

    const cookieStore = await cookies()
    cookieStore.set(COOKIE_NAME, expectedCode, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Verify code error:', error)
    return NextResponse.json(
      { success: false, error: 'Something went wrong' },
      { status: 500 }
    )
  }
}
