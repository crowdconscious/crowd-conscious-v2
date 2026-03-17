import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

/**
 * POST /api/auth/ensure-profile
 *
 * Idempotent: ensures a profile and user_stats exist for a user.
 * Uses UPSERT so calling twice is safe. Uses admin client to bypass RLS.
 *
 * Called from: signup page (after success), auth callback (after email confirmation), login page (if profile missing).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body as { userId?: string }

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Fetch user metadata for profile (needed only when creating)
    const { data: authUser } = await admin.auth.admin.getUserById(userId)
    const email = authUser?.user?.email ?? ''
    const fullName = authUser?.user?.user_metadata?.full_name ?? authUser?.user?.email ?? ''

    // UPSERT profile — idempotent, no error if already exists
    const { error: profileErr } = await admin
      .from('profiles')
      .upsert(
        {
          id: userId,
          email,
          full_name: fullName,
          user_type: 'user',
        },
        { onConflict: 'id', ignoreDuplicates: true }
      )

    if (profileErr) {
      console.error('[ENSURE-PROFILE] profiles upsert failed:', profileErr)
      return NextResponse.json({ error: profileErr.message }, { status: 500 })
    }

    // UPSERT user_stats — idempotent
    const { error: statsErr } = await admin.from('user_stats').upsert(
      {
        user_id: userId,
        total_xp: 0,
        level: 1,
        current_streak: 0,
        longest_streak: 0,
        last_activity: new Date().toISOString(),
      },
      { onConflict: 'user_id', ignoreDuplicates: true }
    )

    if (statsErr) {
      // Non-fatal: user_stats may not exist in some setups
      console.warn('[ENSURE-PROFILE] user_stats upsert skipped:', statsErr.message)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[ENSURE-PROFILE] Exception:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
