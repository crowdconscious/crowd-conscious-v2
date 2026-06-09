import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { isBlogEditorUser } from '@/lib/auth/is-blog-editor'
import { isValidHandle, normalizeHandle } from '@/lib/i18n/creator'

/**
 * POST /api/creator/handle  { handle: string }
 *
 * Lets an authenticated creator claim/update their own public handle. The
 * handle powers `/app?ref=<handle>` and `/sponsor/blog/{id}?ref=<handle>`.
 *
 * Validation: format `^[a-z0-9_]{3,30}$` + case-insensitive uniqueness. We use
 * the admin client (validated + scoped strictly to `id = auth.uid()`) because
 * the per-creator profile update path is sensitive and we want a clean
 * uniqueness check independent of profiles RLS column nuances.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!isBlogEditorUser(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const raw = typeof body.handle === 'string' ? body.handle : ''
    const handle = normalizeHandle(raw)
    if (!isValidHandle(handle)) {
      return NextResponse.json({ error: 'invalid_handle' }, { status: 422 })
    }

    const admin = createAdminClient()
    const { data: taken } = await admin
      .from('profiles')
      .select('id')
      .ilike('handle', handle)
      .neq('id', user.id)
      .maybeSingle()
    if (taken) {
      return NextResponse.json({ error: 'handle_taken' }, { status: 409 })
    }

    const { error } = await admin
      .from('profiles')
      .update({ handle })
      .eq('id', user.id)

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'handle_taken' }, { status: 409 })
      }
      console.error('[creator/handle]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, handle })
  } catch (err) {
    console.error('[creator/handle] Exception:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
