import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { locationCategoryLabel } from '@/lib/locations/categories'

// Mirrors /api/og/market — runs in Node runtime so we can read the
// local logo file and fetch the location cover image with a buffer.

const REVEAL_THRESHOLD = 10

function scoreColor(score: number | null): string {
  if (score == null) return '#475569'
  if (score >= 8) return '#10b981'
  if (score >= 6) return '#f59e0b'
  return '#64748b'
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const { searchParams } = new URL(request.url)
    const locale = (searchParams.get('lang') === 'en' ? 'en' : 'es') as 'es' | 'en'

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: location, error } = await supabase
      .from('conscious_locations')
      .select(
        'name, category, city, neighborhood, total_votes, conscious_score, cover_image_url, instagram_handle, why_conscious, why_conscious_en'
      )
      .eq('slug', slug)
      .maybeSingle()

    if (error || !location) {
      return new ImageResponse(
        (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#0f1419',
              color: 'white',
              fontSize: 48,
              fontWeight: 'bold',
            }}
          >
            Crowd Conscious
          </div>
        ),
        {
          width: 1200,
          height: 630,
          headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' },
        }
      )
    }

    const name = location.name as string
    const category = (location.category ?? 'other') as
      | 'restaurant'
      | 'bar'
      | 'cafe'
      | 'hotel'
      | 'coworking'
      | 'store'
      | 'brand'
      | 'influencer'
      | 'other'
    const catLabel = locationCategoryLabel(category, locale)
    const city = (location.city as string | null) ?? ''
    const neighborhood = (location.neighborhood as string | null) ?? ''
    const placeLine = [neighborhood, city].filter(Boolean).join(', ')
    const votes = Number(location.total_votes ?? 0)
    const rawScore = location.conscious_score as number | string | null
    const score =
      rawScore == null
        ? null
        : typeof rawScore === 'number'
          ? rawScore
          : Number(rawScore)
    const scoreRevealed = score != null && votes >= REVEAL_THRESHOLD
    const ig = (location.instagram_handle as string | null)?.replace(/^@/, '') ?? ''
    const why =
      locale === 'es'
        ? (location.why_conscious as string | null) ||
          (location.why_conscious_en as string | null) ||
          ''
        : (location.why_conscious_en as string | null) ||
          (location.why_conscious as string | null) ||
          ''
    const trimmedWhy = why.slice(0, 180) + (why.length > 180 ? '…' : '')

    // Fetch cover image as base64 so we can paint it as a background layer.
    let coverBase64 = ''
    const coverUrl = location.cover_image_url as string | null
    if (coverUrl) {
      try {
        const res = await fetch(coverUrl)
        if (res.ok) {
          const buf = await res.arrayBuffer()
          const contentType = res.headers.get('content-type') || 'image/jpeg'
          coverBase64 = `data:${contentType};base64,${Buffer.from(buf).toString('base64')}`
        }
      } catch {
        // silent — OG falls back to solid bg
      }
    }

    let logoBase64 = ''
    try {
      try {
        const logoPath = join(process.cwd(), 'public', 'images', 'logo.png')
        const logoData = await readFile(logoPath)
        logoBase64 = `data:image/png;base64,${logoData.toString('base64')}`
      } catch {
        const logoPath = join(process.cwd(), 'public', 'images', 'logo-small.png')
        const logoData = await readFile(logoPath)
        logoBase64 = `data:image/png;base64,${logoData.toString('base64')}`
      }
    } catch {
      // No logo file — text fallback is rendered below.
    }

    const voteCta =
      locale === 'es'
        ? '¿Es un Lugar Consciente? Vota →'
        : 'Is it a Conscious Place? Vote →'

    const voteLabel = locale === 'es' ? 'votos' : 'votes'
    const neededToReveal = Math.max(0, REVEAL_THRESHOLD - votes)
    const scoreCaption = scoreRevealed
      ? locale === 'es'
        ? 'Conscious Score'
        : 'Conscious Score'
      : locale === 'es'
        ? `${neededToReveal} ${neededToReveal === 1 ? 'voto' : 'votos'} para revelar`
        : `${neededToReveal} ${neededToReveal === 1 ? 'vote' : 'votes'} to reveal`

    const titleSize = name.length > 48 ? 56 : name.length > 32 ? 68 : 80

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'row',
            background: '#0f1419',
            position: 'relative',
            fontFamily: 'sans-serif',
          }}
        >
          {/* Left column — cover image with gradient overlay */}
          <div
            style={{
              display: 'flex',
              width: '480px',
              height: '100%',
              position: 'relative',
              background: '#1e293b',
            }}
          >
            {coverBase64 ? (
              <img
                src={coverBase64}
                width={480}
                height={630}
                alt=""
                style={{ display: 'flex', objectFit: 'cover', width: 480, height: 630 }}
              />
            ) : (
              <div
                style={{
                  display: 'flex',
                  width: 480,
                  height: 630,
                  alignItems: 'center',
                  justifyContent: 'center',
                  background:
                    'linear-gradient(135deg, rgba(16,185,129,0.25) 0%, rgba(15,20,25,0.8) 100%)',
                  color: '#10b981',
                  fontSize: 180,
                  fontWeight: 800,
                }}
              >
                {name.charAt(0).toUpperCase()}
              </div>
            )}
            {/* Dark fade so left text (if any) stays readable */}
            <div
              style={{
                display: 'flex',
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(90deg, rgba(15,20,25,0) 55%, rgba(15,20,25,0.8) 100%)',
              }}
            />
          </div>

          {/* Right column — content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              padding: '48px 56px 40px',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {logoBase64 ? (
                  <img
                    src={logoBase64}
                    width={120}
                    height={36}
                    alt=""
                    style={{ display: 'flex', objectFit: 'contain' }}
                  />
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      fontSize: 18,
                      fontWeight: 700,
                      color: '#10b981',
                      letterSpacing: 1,
                    }}
                  >
                    CROWD CONSCIOUS
                  </div>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  alignSelf: 'flex-start',
                  padding: '6px 16px',
                  borderRadius: 999,
                  background: 'rgba(16,185,129,0.15)',
                  border: '1px solid rgba(16,185,129,0.4)',
                  color: '#10b981',
                  fontSize: 18,
                  fontWeight: 600,
                }}
              >
                📍 {catLabel}
                {placeLine ? ` · ${placeLine}` : ''}
              </div>

              <div
                style={{
                  display: 'flex',
                  fontSize: titleSize,
                  fontWeight: 800,
                  color: '#ffffff',
                  lineHeight: 1.05,
                  letterSpacing: -1,
                  marginTop: 6,
                }}
              >
                {name}
              </div>

              {trimmedWhy ? (
                <div
                  style={{
                    display: 'flex',
                    fontSize: 22,
                    color: '#cbd5e1',
                    lineHeight: 1.3,
                    maxHeight: 110,
                    overflow: 'hidden',
                  }}
                >
                  {trimmedWhy}
                </div>
              ) : null}

              {ig ? (
                <div
                  style={{
                    display: 'flex',
                    fontSize: 20,
                    color: '#94a3b8',
                  }}
                >
                  @{ig}
                </div>
              ) : null}
            </div>

            {/* Bottom row — score + CTA */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                borderTop: '1px solid rgba(148,163,184,0.2)',
                paddingTop: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                {scoreRevealed ? (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '10px 18px',
                      borderRadius: 14,
                      background: scoreColor(score),
                      color: 'white',
                      minWidth: 108,
                    }}
                  >
                    <div style={{ display: 'flex', fontSize: 36, fontWeight: 800, lineHeight: 1 }}>
                      {score!.toFixed(1)}
                    </div>
                    <div style={{ display: 'flex', fontSize: 14, opacity: 0.85, marginTop: 2 }}>
                      / 10
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '10px 18px',
                      borderRadius: 14,
                      background: 'rgba(148,163,184,0.12)',
                      border: '1px solid rgba(148,163,184,0.25)',
                      color: '#94a3b8',
                      minWidth: 108,
                    }}
                  >
                    <div style={{ display: 'flex', fontSize: 28, fontWeight: 800 }}>?/10</div>
                    <div style={{ display: 'flex', fontSize: 12, marginTop: 2 }}>
                      {locale === 'es' ? 'por revelar' : 'to reveal'}
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', fontSize: 22, fontWeight: 700, color: '#ffffff' }}>
                    {votes} {voteLabel}
                  </div>
                  <div style={{ display: 'flex', fontSize: 14, color: '#64748b' }}>
                    {scoreCaption}
                  </div>
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#10b981',
                }}
              >
                {voteCta}
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' },
      }
    )
  } catch (e) {
    console.error('[OG location] error:', e)
    return new Response('Failed to generate image', { status: 500 })
  }
}
