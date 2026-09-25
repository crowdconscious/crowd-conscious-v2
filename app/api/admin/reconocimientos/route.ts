import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-route-guard'
import {
  listRecognitions,
  RECOGNITION_STATUSES,
  sanitizeSrc,
} from '@/lib/reconocimientos'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/reconocimientos?status=&src=
 * Admin triage queue for Reconocimientos.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const statusRaw = searchParams.get('status')
    const srcRaw = searchParams.get('src')

    const status =
      statusRaw &&
      (RECOGNITION_STATUSES as readonly string[]).includes(statusRaw)
        ? statusRaw
        : undefined
    const src = srcRaw ? sanitizeSrc(srcRaw) : undefined

    const items = await listRecognitions({
      status,
      src: srcRaw ? src : undefined,
      limit: 100,
    })

    return NextResponse.json({ items })
  } catch (err) {
    console.error('[api/admin/reconocimientos GET]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
