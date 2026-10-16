import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ORG_PORTAL_V2 } from '@/lib/org/config'
import { getReadingRow, logEvent, orgDb } from '@/lib/org/repo'
import { canCloseEarly, canExtend, canSetVisibility } from '@/lib/org/rules'
import { denied, orgContext } from '@/lib/org/server-reading'

export const runtime = 'nodejs'

const body = z.discriminatedUnion('action', [
  z.object({ action: z.literal('visibility'), value: z.enum(['private', 'public']) }),
  z.object({ action: z.literal('extend'), days: z.number().int().min(1).max(60) }),
  z.object({ action: z.literal('close') }),
])

/** Owner controls. Every rule is re-checked here; the UI only mirrors them. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  if (!ORG_PORTAL_V2) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { slug, id } = await params
  const c = await orgContext(slug)
  if (!c.ok) return denied(c.access)
  if (c.ctx.demo) return NextResponse.json({ error: 'demo_read_only' }, { status: 403 })
  if (c.ctx.role !== 'owner') return NextResponse.json({ error: 'owner_only' }, { status: 403 })
  const parsed = body.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  const row = await getReadingRow(c.ctx.org!.id, id)
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { count } = await orgDb().from('org_responses').select('id', { count: 'exact', head: true }).eq('reading_id', id)
  const state = { status: row.status, fieldCloses: row.field_closes, extendedDays: row.extended_days, responded: count ?? 0 }
  const now = new Date().toISOString()
  const a = parsed.data

  if (a.action === 'visibility') {
    if (!canSetVisibility(row.status)) return NextResponse.json({ error: 'visibility_locked' }, { status: 409 })
    if (row.visibility === a.value) return NextResponse.json({ ok: true, unchanged: true })
    const { error } = await orgDb().from('org_readings').update({ visibility: a.value, updated_at: now }).eq('id', id).eq('org_id', c.ctx.org!.id)
    if (error) return NextResponse.json({ error: 'update_failed' }, { status: 500 })
    // Audit trail: who switched, from what, to what, in which status.
    await logEvent(id, c.ctx.userId, 'visibility_set', { from: row.visibility, value: a.value, status: row.status })
    // Public pages (/sello-verificado/*) are force-dynamic, so listings and the Sello update on the next request.
    return NextResponse.json({ ok: true })
  }
  if (a.action === 'extend') {
    const chk = canExtend(c.ctx.rules, state, a.days)
    if (!chk.ok) return NextResponse.json({ error: chk.reason }, { status: 409 })
    const closes = new Date(new Date(row.field_closes!).getTime() + a.days * 86400000).toISOString()
    const { data } = await orgDb()
      .from('org_readings')
      .update({ field_closes: closes, extended_days: row.extended_days + a.days, updated_at: now })
      .eq('id', id)
      .eq('status', 'field')
      .eq('extended_days', row.extended_days)
      .select('id')
    if (!data?.length) return NextResponse.json({ error: 'conflict' }, { status: 409 })
    await logEvent(id, c.ctx.userId, 'extended', { days: a.days, field_closes: closes })
    return NextResponse.json({ ok: true, field_closes: closes })
  }
  const chk = canCloseEarly(c.ctx.rules, state)
  if (!chk.ok) return NextResponse.json({ error: chk.reason }, { status: 409 })
  await orgDb().from('org_readings').update({ status: 'closed', closed_at: now, closed_early: true, field_closes: now, updated_at: now }).eq('id', id).eq('status', 'field')
  await logEvent(id, c.ctx.userId, 'closed_early', { responded: state.responded, preliminary: chk.preliminary })
  return NextResponse.json({ ok: true, preliminary: chk.preliminary })
}
