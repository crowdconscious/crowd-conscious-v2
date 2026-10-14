import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-route-guard'
import { ORG_PORTAL_V2 } from '@/lib/org/config'
import { provisionOrgFromRequest } from '@/lib/org/provision'

export const runtime = 'nodejs'

/** Admin: turn a proposal/call request (org_pilot_requests) into a client org + owner seat. Idempotent. */
export async function POST(request: NextRequest) {
  if (!ORG_PORTAL_V2) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const gate = await requireAdmin()
  if (!gate.ok) return gate.response
  const p = z.object({ request_id: z.string().uuid() }).safeParse(await request.json().catch(() => null))
  if (!p.success) return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  const res = await provisionOrgFromRequest(p.data.request_id, { requirePaid: false })
  return NextResponse.json(res, { status: res.ok ? 200 : 400 })
}
