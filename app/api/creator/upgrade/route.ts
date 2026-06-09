import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { isAdminUser } from '@/lib/auth/is-admin'
import { isValidHandle, normalizeHandle } from '@/lib/i18n/creator'

/**
 * POST /api/creator/upgrade  { handle?: string }
 *
 * Self-serve creator upgrade for an ALREADY-AUTHENTICATED user. Converts the
 * current session's account to the canonical creator role
 * (`profiles.user_type = 'influencer'`) and claims their public `handle` — the
 * same end state as `/api/auth/ensure-creator`, but driven from the session
 * instead of a freshly-signed-up `userId`, so an existing user never has to
 * re-register (which fails with "this email already has an account").
 *
 * Idempotent: an account that is already `influencer` returns success
 * (optionally updating the handle when one is supplied).
 *
 * Refuses to convert admin / super-admin accounts (never downgrade an admin)
 * and corporate (`is_corporate_user`) accounts. Uses the admin client so the
 * role + handle write is independent of profiles RLS column nuances, but
 * strictly scoped to `id = auth.uid()`.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = user.id
    const alreadyCreator = user.user_type === 'influencer'

    // Never convert admins (would downgrade their role) or corporate accounts.
    if (!alreadyCreator) {
      if (isAdminUser(user) || user.is_corporate_user === true) {
        return NextResponse.json({ error: 'forbidden_role' }, { status: 403 })
      }
    }

    const body = (await request.json().catch(() => ({}))) as { handle?: string }
    const raw = typeof body.handle === 'string' ? body.handle : ''

    // Idempotent no-op: already a creator and no new handle to claim.
    if (alreadyCreator && !raw.trim()) {
      return NextResponse.json({
        success: true,
        handle: (user.handle as string | null | undefined) ?? null,
      })
    }

    const handle = normalizeHandle(raw)
    if (!isValidHandle(handle)) {
      return NextResponse.json({ error: 'invalid_handle' }, { status: 422 })
    }

    const admin = createAdminClient()

    const { data: taken } = await admin
      .from('profiles')
      .select('id')
      .ilike('handle', handle)
      .neq('id', userId)
      .maybeSingle()
    if (taken) {
      return NextResponse.json({ error: 'handle_taken' }, { status: 409 })
    }

    const { error: profileErr } = await admin
      .from('profiles')
      .update({ user_type: 'influencer', handle })
      .eq('id', userId)

    if (profileErr) {
      // Unique-violation on the case-insensitive handle index => taken.
      if (profileErr.code === '23505') {
        return NextResponse.json({ error: 'handle_taken' }, { status: 409 })
      }
      console.error('[creator/upgrade] profiles update failed:', profileErr)
      return NextResponse.json({ error: profileErr.message }, { status: 500 })
    }

    // Best-effort user_stats row so the creator also has a normal player profile.
    await admin.from('user_stats').upsert(
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

    return NextResponse.json({ success: true, handle })
  } catch (err) {
    console.error('[creator/upgrade] Exception:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
