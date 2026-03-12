import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

/**
 * POST /api/auth/ensure-profile
 *
 * Safety net: ensures a profile exists for a user. The on_auth_user_created
 * trigger should create profiles automatically; this endpoint catches cases
 * where the trigger failed or the user signed up before the trigger existed.
 *
 * Called from: auth callback (after email confirmation), login page (if profile missing).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body as { userId?: string }

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Check if profile already exists (trigger should have created it)
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (existingProfile) {
      return NextResponse.json({ success: true, source: 'existing' })
    }

    // Profile doesn't exist (trigger may have failed) — create it
    const { data: user } = await supabase.auth.admin.getUserById(userId)

    const { error } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        full_name: user?.user?.user_metadata?.full_name ?? user?.user?.email ?? '',
        email: user?.user?.email ?? '',
        user_type: 'user',
      })
      .select()
      .single()

    if (error && error.code !== '23505') {
      // 23505 = unique violation (already exists)
      console.error('[ENSURE-PROFILE] Insert failed:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, source: 'created' })
  } catch (err) {
    console.error('[ENSURE-PROFILE] Exception:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
