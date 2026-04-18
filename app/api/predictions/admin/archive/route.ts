import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

type Resource = 'market' | 'inbox' | 'agent_content' | 'live_event'

const RESOURCES: Resource[] = ['market', 'inbox', 'agent_content', 'live_event']

const TABLE_BY_RESOURCE: Record<Resource, string> = {
  market: 'prediction_markets',
  inbox: 'conscious_inbox',
  agent_content: 'agent_content',
  live_event: 'live_events',
}

const MAX_BULK_IDS = 200

function isAdmin(profile: { user_type?: string } | null, email: string | null | undefined) {
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim()
  const em = email?.toLowerCase().trim()
  return profile?.user_type === 'admin' || (!!adminEmail && !!em && em === adminEmail)
}

/**
 * Manual archive (admin). Soft-deletes by setting `archived_at = now()`
 * (or clears it back to NULL when `restore: true`).
 *
 * Request body:
 *   { resource: 'market' | 'inbox' | 'agent_content' | 'live_event',
 *     id?: string,            // single
 *     ids?: string[],         // bulk (max 200)
 *     restore?: boolean }     // unarchive instead of archive
 *
 * Returns: { ok, archived_at | null, count }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const client = await createClient()
    const { data: profile } = await client
      .from('profiles')
      .select('user_type, email')
      .eq('id', user.id)
      .single()

    if (!isAdmin(profile as { user_type?: string }, (user as { email?: string | null }).email)) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const body = (await request.json()) as {
      resource?: Resource
      id?: string
      ids?: string[]
      restore?: boolean
    }
    const resource = body.resource
    if (!resource || !RESOURCES.includes(resource)) {
      return NextResponse.json({ error: 'Invalid resource' }, { status: 400 })
    }

    /** Coalesce single id into the bulk array so we have one code path. */
    const ids = (
      Array.isArray(body.ids) && body.ids.length > 0
        ? body.ids
        : body.id
          ? [body.id]
          : []
    )
      .map((s) => String(s ?? '').trim())
      .filter(Boolean)

    if (ids.length === 0) {
      return NextResponse.json({ error: 'No ids provided' }, { status: 400 })
    }
    if (ids.length > MAX_BULK_IDS) {
      return NextResponse.json(
        { error: `Too many ids (max ${MAX_BULK_IDS} per request)` },
        { status: 400 }
      )
    }

    const restore = body.restore === true
    const archivedAt = restore ? null : new Date().toISOString()
    const admin = createAdminClient()
    const table = TABLE_BY_RESOURCE[resource]

    let query = admin.from(table).update({ archived_at: archivedAt }).in('id', ids)
    /**
     * Skip rows that are already in the destination state — keeps
     * counts honest and avoids accidentally re-stamping `archived_at`
     * on a row someone restored five minutes ago.
     */
    query = restore
      ? query.not('archived_at', 'is', null)
      : query.is('archived_at', null)

    const { data, error } = await query.select('id')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      ok: true,
      archived_at: archivedAt,
      count: data?.length ?? 0,
      restored: restore,
    })
  } catch (err) {
    console.error('archive POST', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    )
  }
}
