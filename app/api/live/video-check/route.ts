import { NextResponse } from 'next/server'

export const runtime = 'edge'

/**
 * Checks whether a YouTube video is publicly embeddable by hitting the
 * oEmbed endpoint server-side (the client can't do this reliably because
 * YouTube's oEmbed response doesn't send CORS headers).
 *
 * Returns `{ available: boolean }`.
 *  - 200/JSON from oEmbed → available
 *  - 401 (private) / 404 (removed) / anything else → unavailable
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const videoId = searchParams.get('v')?.trim()

  if (!videoId || !/^[\w-]{6,20}$/.test(videoId)) {
    return NextResponse.json({ available: false }, { status: 400 })
  }

  const oembed = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${encodeURIComponent(
    videoId
  )}&format=json`

  try {
    const res = await fetch(oembed, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
    const available = res.ok
    return NextResponse.json(
      { available },
      {
        headers: {
          'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
        },
      }
    )
  } catch {
    return NextResponse.json({ available: false })
  }
}
