import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { isAdminUser } from '@/lib/auth/is-admin'
import { sendPushToUser } from '@/lib/expo-push'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/push/test
 *
 * Sends a single test push to every device token registered for the
 * requesting admin. Use to verify Expo/APNs wiring without publishing a Pulse.
 */
export async function POST() {
  const profile = await getCurrentUser()
  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isAdminUser(profile)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data: tokens, error: tokenErr } = await admin
    .from('push_tokens')
    .select('id')
    .eq('user_id', profile.id)

  if (tokenErr) {
    return NextResponse.json({ error: tokenErr.message }, { status: 500 })
  }

  const tokenCount = tokens?.length ?? 0
  if (tokenCount === 0) {
    return NextResponse.json(
      {
        error: 'no_push_tokens',
        message:
          'No push tokens registered for your account. Open the mobile app, enable push notifications, and grant OS permission.',
      },
      { status: 404 }
    )
  }

  try {
    await sendPushToUser(admin, profile.id, {
      title: 'Crowd Conscious — test push',
      body: 'If you see this, push delivery is working.',
      data: { type: 'admin_test', route: '/(drawer)/(tabs)/pulses' },
      badge: 1,
    })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    console.warn('[admin/push/test] send failed:', err)
    return NextResponse.json({ error: detail }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    token_count: tokenCount,
    message: 'Test push queued for your registered device(s).',
  })
}
