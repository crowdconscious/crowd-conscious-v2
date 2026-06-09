import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { isValidHandle, normalizeHandle } from '@/lib/i18n/creator'

/**
 * POST /api/auth/ensure-creator
 *
 * Self-serve creator onboarding. Called right after `supabase.auth.signUp`
 * from the creator signup page. Assigns the canonical creator role
 * (`profiles.user_type = 'influencer'`) with NO admin grant, and optionally
 * claims the creator's unique public `handle` (the one used by
 * `/app?ref=<handle>` and `/sponsor/blog/{id}?ref=<handle>`).
 *
 * Idempotent: upserts by id. Uses the admin client to bypass RLS (the row may
 * not exist yet right after signUp, before email confirmation). The role is
 * preserved across the later email-confirm `ensure-profile` call (that route
 * no longer downgrades a non-'user' role).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, fullName, handle } = body as {
      userId?: string
      fullName?: string
      handle?: string
    }

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: authUser } = await admin.auth.admin.getUserById(userId)
    const email = authUser?.user?.email ?? ''
    const metaName =
      typeof authUser?.user?.user_metadata?.full_name === 'string'
        ? (authUser.user.user_metadata.full_name as string)
        : ''
    const resolvedName = (fullName?.trim() || metaName.trim() || (email.includes('@') ? email.split('@')[0] : '')) || ''

    // Validate + reserve the handle (when supplied) before writing the role.
    let normalizedHandle: string | null = null
    if (handle && handle.trim()) {
      normalizedHandle = normalizeHandle(handle)
      if (!isValidHandle(normalizedHandle)) {
        return NextResponse.json(
          { error: 'invalid_handle' },
          { status: 422 }
        )
      }
      const { data: taken } = await admin
        .from('profiles')
        .select('id')
        .ilike('handle', normalizedHandle)
        .neq('id', userId)
        .maybeSingle()
      if (taken) {
        return NextResponse.json({ error: 'handle_taken' }, { status: 409 })
      }
    }

    const upsertRow: Record<string, unknown> = {
      id: userId,
      email,
      full_name: resolvedName,
      user_type: 'influencer',
    }
    if (normalizedHandle) upsertRow.handle = normalizedHandle

    const { error: profileErr } = await admin
      .from('profiles')
      .upsert(upsertRow, { onConflict: 'id' })

    if (profileErr) {
      // Unique-violation on the case-insensitive handle index => taken.
      if (profileErr.code === '23505') {
        return NextResponse.json({ error: 'handle_taken' }, { status: 409 })
      }
      console.error('[ENSURE-CREATOR] profiles upsert failed:', profileErr)
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

    return NextResponse.json({ success: true, handle: normalizedHandle })
  } catch (err) {
    console.error('[ENSURE-CREATOR] Exception:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
