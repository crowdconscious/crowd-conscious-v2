import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-route-guard'
import { ORG_PORTAL_V2 } from '@/lib/org/config'
import { getOrgBySlug, orgDb } from '@/lib/org/repo'

export const runtime = 'nodejs'

/** Admin: per-client field rules, seats and billing status (billing drives the Sello). */
const body = z
  .object({
    max_extension_days: z.number().int().min(0).max(60),
    allow_early_close: z.boolean(),
    seat_limit: z.number().int().min(1).max(50),
    billing_status: z.enum(['active', 'inactive']),
    plan: z.enum(['pilot', 'anual', 'continua']),
  })
  .partial()

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  if (!ORG_PORTAL_V2) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const gate = await requireAdmin()
  if (!gate.ok) return gate.response
  const org = await getOrgBySlug((await params).slug)
  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const p = body.safeParse(await request.json().catch(() => null))
  if (!p.success || !Object.keys(p.data).length) return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  await orgDb().from('orgs').update({ ...p.data, updated_at: new Date().toISOString() }).eq('id', org.id)
  return NextResponse.json({ ok: true })
}
