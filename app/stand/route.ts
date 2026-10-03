import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import {
  buildStandRedirectUrl,
  cdmxToday,
  pickStandPulse,
  resolveStandEventTag,
  type StandPulseRow,
} from '@/lib/pulse/stand-redirect'

/**
 * GET /stand — printed QR landing for event stand Pulses.
 *
 * Always redirects (307) with Cache-Control: no-store so the same QR can
 * point at a different Pulse each conference day. Selection is driven by
 * `tags` + `metadata.stand_day` (America/Mexico_City), never hard-coded IDs.
 */
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

const NO_STORE = 'no-store, max-age=0'

export async function GET(request: NextRequest) {
  const eventTag = resolveStandEventTag(request.nextUrl.searchParams.get('event'))
  const todayCdmx = cdmxToday()

  let rows: StandPulseRow[] = []
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('prediction_markets')
      .select('id, published_at, created_at, metadata')
      .eq('is_pulse', true)
      .eq('is_draft', false)
      .contains('tags', [eventTag])
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('[stand] query error:', error.message)
    } else {
      rows = (data ?? []) as StandPulseRow[]
    }
  } catch (err) {
    console.error('[stand] query threw:', err instanceof Error ? err.message : err)
  }

  const picked = pickStandPulse(rows, todayCdmx)
  const targetPath = picked ? `/pulse/${picked.id}` : '/pulse/results'
  const redirectUrl = buildStandRedirectUrl(
    request.nextUrl.origin,
    targetPath,
    request.nextUrl.searchParams,
    ['event']
  )

  const response = NextResponse.redirect(redirectUrl, 307)
  response.headers.set('Cache-Control', NO_STORE)
  return response
}
