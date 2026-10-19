import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth-server'
import { isAdminUser } from '@/lib/auth/is-admin'
import { adminAct, adminGrant } from '@/lib/lugar/repo'

import { LUGAR_CONSCIENTE_ENABLED } from '@/lib/lugar/config'

export const runtime = 'nodejs'

const body = z.discriminatedUnion('action', [
  z.object({ action: z.enum(['approve', 'revoke', 'extend']), award_id: z.string().uuid(), note: z.string().max(1000).optional() }),
  z.object({ action: z.literal('grant'), location_id: z.string().uuid(), note: z.string().max(1000).optional() }),
])

/** Admin review / override for Lugar Consciente awards. Every action is logged in seal_award_events. */
export async function POST(request: NextRequest) {
  if (!LUGAR_CONSCIENTE_ENABLED) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const user = await getCurrentUser()
  if (!user || !isAdminUser(user)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const parsed = body.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  const a = parsed.data
  const r = a.action === 'grant' ? await adminGrant(a.location_id, user.id, a.note ?? null) : await adminAct(a.award_id, a.action, user.id, a.note ?? null)
  return NextResponse.json(r, { status: r.ok ? 200 : 409 })
}
