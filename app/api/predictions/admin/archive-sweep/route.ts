import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

type Resource =
  | 'agent_content'
  | 'market_resolved'
  | 'live_event_completed'

const MAX_DAYS = 365 * 5
const DEFAULT_DAYS = 30

function isAdmin(profile: { user_type?: string } | null, email: string | null | undefined) {
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim()
  const em = email?.toLowerCase().trim()
  return profile?.user_type === 'admin' || (!!adminEmail && !!em && em === adminEmail)
}

/**
 * Bulk-archive maintenance sweep. Lets the admin clean out long tails
 * of stale content with a single call instead of clicking through
 * dozens of cards. Restricted to admin-controlled resources where
 * "old" has a clear meaning:
 *
 *   • agent_content         — older than N days
 *   • market_resolved       — resolved/cancelled markets older than N days
 *   • live_event_completed  — completed/cancelled events older than N days
 *
 * Optional `contentType?` narrows the agent_content sweep to a single
 * tab (e.g. 'news_summary', 'weekly_digest', 'market_suggestion').
 *
 * Body: { resource, days?: number, contentType?: string, dryRun?: boolean }
 * Returns: { ok, count, cutoff, dryRun }
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
      days?: number
      contentType?: string
      dryRun?: boolean
    }

    const resource = body.resource
    if (!resource) {
      return NextResponse.json({ error: 'resource required' }, { status: 400 })
    }

    const daysRaw = Number.isFinite(body.days) ? Math.floor(Number(body.days)) : DEFAULT_DAYS
    const days = Math.min(Math.max(0, daysRaw), MAX_DAYS)
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    const dryRun = body.dryRun === true
    const archivedAt = new Date().toISOString()
    const admin = createAdminClient()

    let count = 0

    if (resource === 'agent_content') {
      let q = admin
        .from('agent_content')
        .update({ archived_at: archivedAt })
        .is('archived_at', null)
        .lte('created_at', cutoff)
      if (body.contentType) q = q.eq('content_type', body.contentType)
      if (dryRun) {
        const probe = admin
          .from('agent_content')
          .select('id', { count: 'exact', head: true })
          .is('archived_at', null)
          .lte('created_at', cutoff)
        if (body.contentType) probe.eq('content_type', body.contentType)
        const { count: c, error } = await probe
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        count = c ?? 0
      } else {
        const { data, error } = await q.select('id')
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        count = data?.length ?? 0
      }
    } else if (resource === 'market_resolved') {
      const eligibleStatuses = ['resolved', 'cancelled']
      if (dryRun) {
        const { count: c, error } = await admin
          .from('prediction_markets')
          .select('id', { count: 'exact', head: true })
          .is('archived_at', null)
          .in('status', eligibleStatuses)
          .lte('updated_at', cutoff)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        count = c ?? 0
      } else {
        const { data, error } = await admin
          .from('prediction_markets')
          .update({ archived_at: archivedAt })
          .is('archived_at', null)
          .in('status', eligibleStatuses)
          .lte('updated_at', cutoff)
          .select('id')
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        count = data?.length ?? 0
      }
    } else if (resource === 'live_event_completed') {
      const eligibleStatuses = ['completed', 'cancelled']
      if (dryRun) {
        const { count: c, error } = await admin
          .from('live_events')
          .select('id', { count: 'exact', head: true })
          .is('archived_at', null)
          .in('status', eligibleStatuses)
          .lte('match_date', cutoff)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        count = c ?? 0
      } else {
        const { data, error } = await admin
          .from('live_events')
          .update({ archived_at: archivedAt })
          .is('archived_at', null)
          .in('status', eligibleStatuses)
          .lte('match_date', cutoff)
          .select('id')
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        count = data?.length ?? 0
      }
    } else {
      return NextResponse.json({ error: 'Invalid resource' }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      count,
      cutoff,
      days,
      dryRun,
      resource,
      contentType: body.contentType ?? null,
    })
  } catch (err) {
    console.error('archive-sweep POST', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    )
  }
}
