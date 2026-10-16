import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase-server'
import { getLocationBySlug, userOwnsLocation } from '@/lib/perks/location-owner'
import { clientIp } from '@/lib/org/survey-guard'
import { acceptPledge, ensureSrcSlug, latestPledge, pledgeIsCurrent } from '@/lib/lugar/repo'
import { locationCanJoin } from '@/lib/lugar/rules'

import { LUGAR_CONSCIENTE_ENABLED } from '@/lib/lugar/config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const body = z.object({
  action: z.literal('accept_values'),
  signer_name: z.string().trim().min(1).max(200),
  signer_role: z.string().trim().max(120).optional(),
  agree: z.literal(true),
})

/** POST: the location owner accepts our 7 values (one acceptance, all together). */
export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  if (!LUGAR_CONSCIENTE_ENABLED) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 })
  const { slug } = await params
  const loc = await getLocationBySlug(supabase, slug)
  if (!loc) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (!(await userOwnsLocation(supabase, loc.id, user.id, user.email))) return NextResponse.json({ error: 'owner_only' }, { status: 403 })
  if (!locationCanJoin(loc.status)) return NextResponse.json({ error: 'location_not_eligible' }, { status: 409 })
  const parsed = body.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  const subj = { locationId: loc.id }
  if (pledgeIsCurrent(await latestPledge(subj))) return NextResponse.json({ ok: true, unchanged: true })
  await ensureSrcSlug(loc)
  const p = await acceptPledge(subj, { profileId: user.id, name: parsed.data.signer_name, role: parsed.data.signer_role ?? null }, clientIp(request.headers))
  return NextResponse.json({ ok: true, accepted_at: p.accepted_at, version: p.version })
}
