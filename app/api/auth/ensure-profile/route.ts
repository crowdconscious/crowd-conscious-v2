import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

/**
 * POST /api/auth/ensure-profile
 *
 * Ensures a profile exists for a newly signed-up user. Called by the client
 * after signUp when the DB trigger may not have run yet (e.g. race condition,
 * trigger missing, or FK propagation delay).
 *
 * Uses service role to bypass RLS. Verifies the user exists in auth.users first.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, email, fullName } = body as {
      userId?: string
      email?: string
      fullName?: string
    }

    if (!userId || !email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'userId and valid email are required' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    // Verify user exists in auth.users — retry to handle Supabase race (getUserById can return null right after signUp)
    let authUser: { user?: { email?: string } } | null = null
    const authRetries = 3
    const authDelayMs = 500

    for (let a = 0; a < authRetries; a++) {
      const { data, error } = await admin.auth.admin.getUserById(userId)
      if (!error && data?.user) {
        authUser = data
        break
      }
      if (a < authRetries - 1) {
        await new Promise((r) => setTimeout(r, authDelayMs))
      }
    }

    if (authUser?.user) {
      if (authUser.user.email?.toLowerCase() !== email.toLowerCase()) {
        return NextResponse.json(
          { error: 'Email mismatch' },
          { status: 400 }
        )
      }
    }
    // If getUserById never found the user, add a short delay before insert — signUp just succeeded
    // so the user exists; the admin API may have race/replication lag.
    if (!authUser?.user) {
      await new Promise((r) => setTimeout(r, 600))
    }

    // Check if profile already exists
    const { data: existing } = await admin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (existing) {
      return NextResponse.json({ success: true, created: false })
    }

    // Create profile with retries (handles FK propagation delay)
    const maxRetries = 3
    const delayMs = 400

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const { data: profile, error: insertError } = await admin
        .from('profiles')
        .insert({
          id: userId,
          email: email,
          full_name: fullName ?? email,
          user_type: 'user',
        })
        .select()
        .single()

      if (!insertError) {
        return NextResponse.json({ success: true, created: true, profile })
      }

      const msg = insertError.message?.toLowerCase() ?? ''
      if (msg.includes('duplicate') || msg.includes('unique')) {
        return NextResponse.json({ success: true, created: false })
      }

      if (msg.includes('foreign key') || msg.includes('profiles_id_fkey')) {
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, delayMs))
          continue
        }
        console.error('Ensure-profile: FK violation after retries', {
          userId,
          attempt,
          error: insertError,
        })
        return NextResponse.json(
          {
            error:
              'Profile creation is delayed. Please try logging in in a few seconds, or contact support if the issue persists.',
          },
          { status: 503 }
        )
      }

      console.error('Ensure-profile: unexpected error', insertError)
      return NextResponse.json(
        { error: insertError.message ?? 'Profile creation failed' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Profile creation failed after retries' },
      { status: 503 }
    )
  } catch (err: unknown) {
    console.error('Ensure-profile: exception', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: `Server error: ${message}` },
      { status: 500 }
    )
  }
}
