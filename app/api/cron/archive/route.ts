import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const maxDuration = 30
export const dynamic = 'force-dynamic'

/**
 * Daily: archive old resolved/cancelled markets, old agent content, processed inbox.
 * Vercel cron — Authorization: Bearer CRON_SECRET
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date().toISOString()
  const resolvedCutoff = new Date(Date.now() - 7 * 86400000).toISOString()
  const cancelledCutoff = new Date(Date.now() - 3 * 86400000).toISOString()
  const agentCutoff = new Date(Date.now() - 14 * 86400000).toISOString()
  const inboxCutoff = new Date(Date.now() - 7 * 86400000).toISOString()
  const blogDraftCutoff = new Date(Date.now() - 14 * 86400000).toISOString()

  const { data: resolvedRows, error: e1 } = await admin
    .from('prediction_markets')
    .update({ archived_at: now })
    .eq('status', 'resolved')
    .is('archived_at', null)
    .lt('updated_at', resolvedCutoff)
    .select('id')

  const { data: cancelledRows, error: e2 } = await admin
    .from('prediction_markets')
    .update({ archived_at: now })
    .eq('status', 'cancelled')
    .is('archived_at', null)
    .lt('updated_at', cancelledCutoff)
    .select('id')

  const { data: agentRows, error: e3 } = await admin
    .from('agent_content')
    .update({ archived_at: now })
    .is('archived_at', null)
    .lt('created_at', agentCutoff)
    .select('id')

  const { data: inboxRows, error: e4 } = await admin
    .from('conscious_inbox')
    .update({ archived_at: now })
    .in('status', ['approved', 'rejected'])
    .is('archived_at', null)
    .lt('created_at', inboxCutoff)
    .select('id')

  // Auto-archive stale blog drafts (14+ days old, never published) —
  // keeps the content-creator output from accumulating forever.
  const { data: blogDraftRows, error: e5 } = await admin
    .from('blog_posts')
    .update({ status: 'archived' })
    .eq('status', 'draft')
    .lt('created_at', blogDraftCutoff)
    .select('id')

  const errors = [e1, e2, e3, e4, e5].filter(Boolean).map((e) => (e as Error).message)

  return NextResponse.json({
    archived: {
      marketsResolved: resolvedRows?.length ?? 0,
      marketsCancelled: cancelledRows?.length ?? 0,
      agentContent: agentRows?.length ?? 0,
      inbox: inboxRows?.length ?? 0,
      blogDrafts: blogDraftRows?.length ?? 0,
    },
    timestamp: now,
    errors: errors.length ? errors : undefined,
  })
}
