import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ORG_PORTAL_V2 } from '@/lib/org/config'
import { sendSeatInvite } from '@/lib/org/provision'
import { orgDb } from '@/lib/org/repo'
import { denied, orgContext } from '@/lib/org/server-reading'

export const runtime = 'nodejs'

async function ownerCtx(slug: string) {
  if (!ORG_PORTAL_V2) return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) }
  const c = await orgContext(slug)
  if (!c.ok) return { error: denied(c.access) }
  if (c.ctx.demo) return { error: NextResponse.json({ error: 'demo_read_only' }, { status: 403 }) }
  return { ctx: c.ctx }
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const r = await ownerCtx((await params).slug)
  if (r.error) return r.error
  const { data } = await orgDb().from('org_members').select('id, email, role, accepted_at').eq('org_id', r.ctx.org!.id).order('invited_at')
  return NextResponse.json({ members: data ?? [], seatLimit: r.ctx.rules.seatLimit, role: r.ctx.role })
}

const invite = z.object({ email: z.string().trim().toLowerCase().email().max(320), role: z.enum(['owner', 'viewer']) })

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const r = await ownerCtx((await params).slug)
  if (r.error) return r.error
  if (r.ctx.role !== 'owner') return NextResponse.json({ error: 'owner_only' }, { status: 403 })
  const p = invite.safeParse(await request.json().catch(() => null))
  if (!p.success) return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  const orgId = r.ctx.org!.id
  const { count } = await orgDb().from('org_members').select('id', { count: 'exact', head: true }).eq('org_id', orgId)
  if ((count ?? 0) >= r.ctx.rules.seatLimit) return NextResponse.json({ error: 'seat_limit' }, { status: 409 })
  const { error } = await orgDb().from('org_members').insert({ org_id: orgId, email: p.data.email, role: p.data.role, invited_by: r.ctx.userId })
  if (error) return NextResponse.json({ error: error.code === '23505' ? 'already_member' : 'insert_failed' }, { status: 409 })
  await sendSeatInvite({ email: p.data.email, orgName: r.ctx.name, slug: r.ctx.slug, role: p.data.role, locale: r.ctx.org!.locale })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const r = await ownerCtx((await params).slug)
  if (r.error) return r.error
  if (r.ctx.role !== 'owner') return NextResponse.json({ error: 'owner_only' }, { status: 403 })
  const id = request.nextUrl.searchParams.get('id') ?? ''
  const orgId = r.ctx.org!.id
  const { data: owners } = await orgDb().from('org_members').select('id').eq('org_id', orgId).eq('role', 'owner')
  const ownerIds = ((owners as { id: string }[]) ?? []).map((o) => o.id)
  if (ownerIds.length === 1 && ownerIds[0] === id) return NextResponse.json({ error: 'last_owner' }, { status: 409 })
  await orgDb().from('org_members').delete().eq('org_id', orgId).eq('id', id)
  return NextResponse.json({ ok: true })
}
