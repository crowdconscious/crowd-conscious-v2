import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { buildStandRedirectUrl } from '@/lib/pulse/stand-redirect'
import {
  CONDESA_TAG,
  pickCondesaPulse,
  type CondesaPulseRow,
} from '@/lib/pulse/condesa-redirect'

/**
 * GET /condesa — printed venue QR for the Condesa campaign.
 *
 * Always 307 + no-store so the same QR follows the weekly Pulse. Picks the
 * most recently opened active, non-draft Pulse tagged `condesa-2026` whose
 * resolution_date is in the future; falls back to /pulse. All query params
 * (src=qr_<lugar>, utm_*, …) are forwarded for vote attribution.
 */
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

const NO_STORE = 'no-store, max-age=0'

export async function GET(request: NextRequest) {
  const nowIso = new Date().toISOString()
  let rows: CondesaPulseRow[] = []
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('prediction_markets')
      .select('id, published_at, resolution_date, created_at, metadata')
      .eq('is_pulse', true)
      .eq('is_draft', false)
      .in('status', ['active', 'trading'])
      .contains('tags', [CONDESA_TAG])
      .gt('resolution_date', nowIso)
      .limit(50)

    if (error) {
      console.error('[condesa] query error:', error.message)
    } else {
      rows = (data ?? []) as CondesaPulseRow[]
    }
  } catch (err) {
    console.error('[condesa] query threw:', err instanceof Error ? err.message : err)
  }

  const picked = pickCondesaPulse(rows)
  const targetPath = picked ? `/pulse/${picked.id}` : '/pulse'
  const redirectUrl = buildStandRedirectUrl(
    request.nextUrl.origin,
    targetPath,
    request.nextUrl.searchParams,
    []
  )

  const response = NextResponse.redirect(redirectUrl, 307)
  response.headers.set('Cache-Control', NO_STORE)
  return response
}
