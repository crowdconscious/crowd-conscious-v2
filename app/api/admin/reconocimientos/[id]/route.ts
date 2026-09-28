import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-route-guard'
import {
  MAX_ADMIN_NOTES_LEN,
  MAX_REJECT_DETAIL_LEN,
  REJECT_REASONS,
  getRecognitionById,
  updateRecognitionStatus,
  type RejectReason,
} from '@/lib/reconocimientos'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = {
  action?: string
  reject_reason?: string
  reject_detail?: string
  admin_notes?: string
}

function isRejectReason(value: string): value is RejectReason {
  return (REJECT_REASONS as readonly string[]).includes(value)
}

/**
 * POST /api/admin/reconocimientos/[id]
 * Body:
 *   { action: 'approve' }
 *   { action: 'reject', reject_reason: preset, reject_detail?: string }
 *   { action: 'notes', admin_notes: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Bad id' }, { status: 400 })
    }

    const existing = await getRecognitionById(id)
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const body = (await request.json().catch(() => null)) as Body | null
    const action = body?.action

    if (action === 'notes') {
      if (typeof body?.admin_notes !== 'string') {
        return NextResponse.json(
          { error: 'admin_notes is required' },
          { status: 400 }
        )
      }
      const notes = body.admin_notes.trim().slice(0, MAX_ADMIN_NOTES_LEN)
      const updated = await updateRecognitionStatus(id, {
        admin_notes: notes || null,
      })
      return NextResponse.json({ item: updated })
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { error: 'action must be approve, reject, or notes' },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()

    if (action === 'approve') {
      const updated = await updateRecognitionStatus(id, {
        status: 'approved',
        reviewed_at: now,
        reviewed_by: auth.user.id,
        reject_reason: null,
        reject_detail: null,
      })
      return NextResponse.json({ item: updated })
    }

    // reject — preset reason required
    const reasonRaw =
      typeof body?.reject_reason === 'string' ? body.reject_reason.trim() : ''
    if (!reasonRaw || !isRejectReason(reasonRaw)) {
      return NextResponse.json(
        {
          error:
            'reject_reason must be one of: promo, selfie, autonominacion, menores, queja_senal, politica, otro',
        },
        { status: 400 }
      )
    }
    const detailRaw =
      typeof body?.reject_detail === 'string' ? body.reject_detail.trim() : ''
    const rejectDetail = detailRaw
      ? detailRaw.slice(0, MAX_REJECT_DETAIL_LEN)
      : null

    const updated = await updateRecognitionStatus(id, {
      status: 'rejected',
      reviewed_at: now,
      reviewed_by: auth.user.id,
      reject_reason: reasonRaw,
      reject_detail: rejectDetail,
    })

    return NextResponse.json({ item: updated })
  } catch (err) {
    console.error('[api/admin/reconocimientos POST]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
