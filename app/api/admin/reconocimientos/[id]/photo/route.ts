import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-route-guard'
import {
  downloadRecognitionPhoto,
  getRecognitionById,
} from '@/lib/reconocimientos'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/reconocimientos/[id]/photo
 * Streams the photo for any recognition (including pending) for triage.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  try {
    const { id } = await params
    const row = await getRecognitionById(id)
    if (!row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { buffer, contentType } = await downloadRecognitionPhoto(row.photo_path)

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (err) {
    console.error('[api/admin/reconocimientos/photo]', err)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
