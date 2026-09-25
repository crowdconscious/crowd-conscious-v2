import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-route-guard'
import {
  getRecognitionById,
  updateRecognitionStatus,
} from '@/lib/reconocimientos'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/reconocimientos/[id]
 * Body: { action: 'approve' | 'reject', reject_reason?: string }
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

    const body = (await request.json().catch(() => null)) as {
      action?: string
      reject_reason?: string
    } | null

    const action = body?.action
    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { error: 'action must be approve or reject' },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()
    const rejectReason =
      action === 'reject' && typeof body?.reject_reason === 'string'
        ? body.reject_reason.trim().slice(0, 500) || null
        : null

    const updated = await updateRecognitionStatus(id, {
      status: action === 'approve' ? 'approved' : 'rejected',
      reviewed_at: now,
      reviewed_by: auth.user.id,
      reject_reason: action === 'reject' ? rejectReason : null,
    })

    return NextResponse.json({ item: updated })
  } catch (err) {
    console.error('[api/admin/reconocimientos POST]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
