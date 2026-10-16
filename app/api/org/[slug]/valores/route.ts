import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { denied, orgContext } from '@/lib/org/server-reading'
import { clientIp } from '@/lib/org/survey-guard'
import { acceptPledge, ensurePaidLugar, latestPledge, pledgeIsCurrent } from '@/lib/lugar/repo'

import { LUGAR_CONSCIENTE_ENABLED } from '@/lib/lugar/config'

export const runtime = 'nodejs'

const body = z.object({ signer_name: z.string().trim().min(1).max(200), signer_role: z.string().trim().max(120).optional(), agree: z.literal(true) })

/**
 * Paying client accepts our 7 values (first dashboard visit). Lugar Consciente
 * is then created automatically with awarded_by = 'auto_paid'.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  if (!LUGAR_CONSCIENTE_ENABLED) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { slug } = await params
  const c = await orgContext(slug)
  if (!c.ok) return denied(c.access)
  if (c.ctx.demo) return NextResponse.json({ error: 'demo_read_only' }, { status: 403 })
  if (c.ctx.role !== 'owner') return NextResponse.json({ error: 'owner_only' }, { status: 403 })
  const parsed = body.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  const orgId = c.ctx.org!.id
  if (!pledgeIsCurrent(await latestPledge({ orgId }))) {
    await acceptPledge({ orgId }, { profileId: c.ctx.userId, name: parsed.data.signer_name, role: parsed.data.signer_role ?? null }, clientIp(request.headers))
  }
  const award = await ensurePaidLugar(orgId, c.ctx.billingActive)
  return NextResponse.json({ ok: true, lugar_consciente: award?.status ?? null })
}
