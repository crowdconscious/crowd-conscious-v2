import { NextRequest, NextResponse } from 'next/server'
import {
  downloadRecognitionPhoto,
  getPublicRecognitionBySlug,
} from '@/lib/reconocimientos'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/reconocimientos/media/[slug]
 * Streams the photo for an approved recognition only.
 * Pending/rejected rows are invisible via the public view → 404.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    if (!slug || slug.length > 64) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const recognition = await getPublicRecognitionBySlug(slug)
    if (!recognition) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { buffer, contentType } = await downloadRecognitionPhoto(
      recognition.photo_path
    )

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=604800, immutable',
      },
    })
  } catch (err) {
    console.error('[api/reconocimientos/media]', err)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
