import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import {
  downloadRecognitionPhoto,
  getPublicRecognitionBySlug,
} from '@/lib/reconocimientos'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type CardFormat = 'portrait' | 'story'

const SIZES: Record<CardFormat, { width: number; height: number }> = {
  portrait: { width: 1080, height: 1350 },
  story: { width: 1080, height: 1920 },
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function wrapLines(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length <= maxChars) {
      current = next
      continue
    }
    if (current) lines.push(current)
    current = word
    if (lines.length >= maxLines - 1) {
      // Last line: take remaining and truncate.
      const rest = [current, ...words.slice(words.indexOf(word) + 1)].join(' ')
      lines.push(
        rest.length > maxChars ? `${rest.slice(0, maxChars - 1)}…` : rest
      )
      return lines.slice(0, maxLines)
    }
  }
  if (current) lines.push(current)
  return lines.slice(0, maxLines)
}

/**
 * GET /api/reconocimientos/[slug]/card?format=portrait|story
 * Shareable PNG card for approved recognitions only.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const formatParam = new URL(request.url).searchParams.get('format')
    const format: CardFormat =
      formatParam === 'story' ? 'story' : 'portrait'
    const { width, height } = SIZES[format]

    const recognition = await getPublicRecognitionBySlug(slug)
    if (!recognition) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { buffer: photoBuffer } = await downloadRecognitionPhoto(
      recognition.photo_path
    )

    // Photo fills the top ~72% as a cover crop; text band below.
    const photoH = Math.round(height * 0.72)
    const photoLayer = await sharp(photoBuffer)
      .resize(width, photoH, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 90 })
      .toBuffer()

    const whatLines = wrapLines(recognition.what, 36, 3)
    const whereLine = recognition.where_text.slice(0, 48)

    const textY = photoH + 48
    const whatTspans = whatLines
      .map(
        (line, i) =>
          `<tspan x="56" dy="${i === 0 ? 0 : 44}">${escapeXml(line)}</tspan>`
      )
      .join('')

    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#0f1419"/>
        <rect y="${photoH}" width="100%" height="${height - photoH}" fill="#0f1419"/>
        <rect y="${photoH}" width="100%" height="4" fill="#10b981"/>
        <text x="56" y="${textY}" fill="#ffffff" font-size="36" font-weight="700"
          font-family="system-ui, -apple-system, sans-serif">${whatTspans}</text>
        <text x="56" y="${textY + whatLines.length * 44 + 28}" fill="#94a3b8" font-size="26"
          font-family="system-ui, -apple-system, sans-serif">${escapeXml(whereLine)}</text>
        <text x="56" y="${height - 48}" fill="#10b981" font-size="24" font-weight="600"
          font-family="system-ui, -apple-system, sans-serif">Crowd Conscious</text>
      </svg>
    `

    const card = await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 15, g: 20, b: 25 },
      },
    })
      .composite([
        { input: photoLayer, top: 0, left: 0 },
        { input: Buffer.from(svg), top: 0, left: 0 },
      ])
      .png()
      .toBuffer()

    return new NextResponse(new Uint8Array(card), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      },
    })
  } catch (err) {
    console.error('[api/reconocimientos/card]', err)
    return NextResponse.json({ error: 'Error generating card' }, { status: 500 })
  }
}
