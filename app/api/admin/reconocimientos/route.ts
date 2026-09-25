import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-route-guard'
import {
  getRecognitionEventCounts,
  getWeeklyRecognitionStats,
  listRecognitions,
} from '@/lib/reconocimientos'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/reconocimientos?status=&src=
 * Admin list + lightweight share/download metrics for visible rows.
 */
export async function GET(request: Request) {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.response

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') ?? undefined
    const src = searchParams.get('src') ?? undefined

    const items = await listRecognitions({
      status: status && status !== 'all' ? status : undefined,
      src: src || undefined,
      limit: 100,
    })

    const eventCounts = await getRecognitionEventCounts(items.map((i) => i.id))
    let weekly: Awaited<ReturnType<typeof getWeeklyRecognitionStats>> = []
    try {
      weekly = await getWeeklyRecognitionStats(12)
    } catch (err) {
      // View may not exist until migration 264 is applied.
      console.warn('[admin/reconocimientos] weekly stats unavailable', err)
    }

    return NextResponse.json({ items, eventCounts, weekly })
  } catch (err) {
    console.error('[admin/reconocimientos]', err)
    return NextResponse.json({ error: 'Error al listar' }, { status: 500 })
  }
}
