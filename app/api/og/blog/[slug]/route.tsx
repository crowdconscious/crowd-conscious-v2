import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'
import { getMarketText, getOutcomeLabel } from '@/lib/i18n/market-translations'
import { getBlogCategoryLabel } from '@/lib/blog-categories'

/**
 * Dynamic Open Graph image for blog posts.
 *
 * Layout decision tree:
 *   1. Post embeds a Pulse  → Pulse card (top 2 outcomes + vote count).
 *   2. Post has a cover_image_url → cover as background + dark gradient
 *      + category label + post title overlaid at the bottom.
 *   3. Otherwise → title card (gradient + brand mark + category + title +
 *      TL;DR snippet when present).
 *
 * Every path returns a 1200×630 PNG with `Content-Type: image/png` so
 * WhatsApp / Facebook / iMessage / Twitter all render the large-preview
 * card. Caching is conservative (5 minutes CDN) because vote counts on
 * Pulse-embedded posts change frequently.
 */

const WIDTH = 1200
const HEIGHT = 630

type OutcomeRow = {
  label: string
  probability: unknown
  translations?: unknown
}

function categoryLabel(cat: string | null | undefined, locale: 'es' | 'en'): string {
  if (!cat) return 'Insight'
  return getBlogCategoryLabel(cat, locale)
}

function pickTldrLine(raw: string | null | undefined): string | null {
  if (!raw) return null
  const lines = raw
    .split(/\r?\n+/)
    .map((l) => l.replace(/^\s*[-*•·]\s*/, '').trim())
    .filter(Boolean)
  if (lines.length === 0) return null
  return lines.slice(0, 3).join(' · ')
}

function trimTitle(title: string, max: number): string {
  if (!title) return ''
  return title.length > max ? `${title.slice(0, max - 1)}…` : title
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug: rawSlug } = await params
  const slug = decodeURIComponent(rawSlug)
  const { searchParams } = new URL(request.url)
  const locale: 'es' | 'en' = searchParams.get('lang') === 'en' ? 'en' : 'es'

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: post } = await supabase
    .from('blog_posts')
    .select(
      'title, title_en, excerpt, excerpt_en, tldr, tldr_en, category, cover_image_url, pulse_market_id'
    )
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  // Generic brand card — used only when the slug doesn't resolve to a
  // published post. Still a valid 1200×630 PNG so scrapers don't fall
  // back to the favicon.
  if (!post) {
    return new ImageResponse(<BrandFallback />, {
      width: WIDTH,
      height: HEIGHT,
      headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' },
    })
  }

  const postTitle =
    locale === 'en' && (post as { title_en?: string | null }).title_en?.trim()
      ? String((post as { title_en?: string | null }).title_en)
      : post.title
  const cat = categoryLabel((post as { category?: string | null }).category, locale)
  const tldrLine = pickTldrLine(
    locale === 'en' && (post as { tldr_en?: string | null }).tldr_en
      ? (post as { tldr_en?: string | null }).tldr_en
      : (post as { tldr?: string | null }).tldr
  )

  // === Layout 1: Pulse card ===========================================
  if (post.pulse_market_id) {
    const { data: market } = await supabase
      .from('prediction_markets')
      .select('id, title, translations, total_votes, engagement_count')
      .eq('id', post.pulse_market_id)
      .maybeSingle()

    if (market) {
      const { data: outcomes } = await supabase
        .from('market_outcomes')
        .select('label, probability, translations')
        .eq('market_id', post.pulse_market_id)
        .order('probability', { ascending: false })

      const outcomeRows = (outcomes ?? []) as OutcomeRow[]
      const sorted = [...outcomeRows].sort(
        (a, b) => Number(b.probability) - Number(a.probability)
      )
      const a = sorted[0]
      const b = sorted[1]
      const p1 = a
        ? Math.min(100, Math.max(0, Math.round(Number(a.probability) * 100)))
        : 0
      const p2 = b
        ? Math.min(100, Math.max(0, Math.round(Number(b.probability) * 100)))
        : 0
      const l1 = a ? getOutcomeLabel(a, locale) : '—'
      const l2 = b ? getOutcomeLabel(b, locale) : '—'

      const voteCount =
        Number((market as { total_votes?: number | null }).total_votes) ||
        Number((market as { engagement_count?: number | null }).engagement_count) ||
        0
      const displayTitle = getMarketText(market, 'title', locale)

      return new ImageResponse(
        (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              background:
                'linear-gradient(165deg, #0f1419 0%, #1a2029 45%, #0f1419 100%)',
              padding: 56,
              fontFamily: 'system-ui, sans-serif',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <span style={{ fontSize: 22, color: '#10b981', fontWeight: 700 }}>
                Conscious Pulse
              </span>
              <span
                style={{
                  fontSize: 20,
                  color: '#94a3b8',
                  fontWeight: 500,
                  lineHeight: 1.3,
                }}
              >
                {trimTitle(postTitle, 140)}
              </span>
              <span
                style={{
                  marginTop: 8,
                  fontSize: 36,
                  color: '#f8fafc',
                  fontWeight: 800,
                  lineHeight: 1.2,
                  display: 'flex',
                }}
              >
                {trimTitle(displayTitle, 120)}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
                marginTop: 24,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                  }}
                >
                  <span
                    style={{
                      fontSize: 26,
                      color: '#e2e8f0',
                      fontWeight: 600,
                      maxWidth: '72%',
                    }}
                  >
                    {l1}
                  </span>
                  <span style={{ fontSize: 32, color: '#10b981', fontWeight: 800 }}>
                    {p1}%
                  </span>
                </div>
                {b ? (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 24,
                        color: '#cbd5e1',
                        fontWeight: 500,
                        maxWidth: '72%',
                      }}
                    >
                      {l2}
                    </span>
                    <span style={{ fontSize: 28, color: '#34d399', fontWeight: 700 }}>
                      {p2}%
                    </span>
                  </div>
                ) : null}
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTop: '1px solid #2a3544',
                  paddingTop: 20,
                }}
              >
                <span style={{ fontSize: 22, color: '#94a3b8' }}>
                  {locale === 'es' ? `${voteCount} votos` : `${voteCount} votes`}
                </span>
                <span style={{ fontSize: 16, color: '#64748b', fontWeight: 600 }}>
                  Powered by Conscious Pulse
                </span>
              </div>
            </div>
          </div>
        ),
        {
          width: WIDTH,
          height: HEIGHT,
          headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' },
        }
      )
    }
    // If Pulse lookup failed, fall through to the cover/title card layouts.
  }

  // === Layout 2: Cover-as-background ==================================
  // Use the editor's cover image as the visual, with a dark gradient
  // overlay + post title + category label at the bottom. This is what
  // most editorial publications use for share previews.
  //
  // We deliberately avoid using cover_image_url that points back at this
  // OG endpoint (self-referential — content-creator agent sometimes does
  // this) to prevent rendering loops.
  const rawCover = (post as { cover_image_url?: string | null }).cover_image_url
  const coverIsSelfRef =
    typeof rawCover === 'string' && /\/api\/og\/blog\//.test(rawCover)
  const coverUrl =
    typeof rawCover === 'string' && /^https?:\/\//i.test(rawCover) && !coverIsSelfRef
      ? rawCover
      : null

  if (coverUrl) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            position: 'relative',
            background: '#0f1419',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {/* Cover photo as full-bleed background */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverUrl}
            alt=""
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
          {/* Dark gradient — ensures title is always legible regardless of cover contrast */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background:
                'linear-gradient(to top, rgba(15,20,25,0.95) 0%, rgba(15,20,25,0.6) 45%, rgba(15,20,25,0.25) 100%)',
              display: 'flex',
            }}
          />
          {/* Foreground content */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              width: '100%',
              height: '100%',
              padding: 56,
              gap: 18,
            }}
          >
            <span
              style={{
                fontSize: 20,
                color: '#10b981',
                fontWeight: 700,
                letterSpacing: 2,
                textTransform: 'uppercase',
                display: 'flex',
              }}
            >
              {cat}
            </span>
            <span
              style={{
                fontSize: 56,
                color: '#ffffff',
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: -1,
                display: 'flex',
                textShadow: '0 2px 12px rgba(0,0,0,0.5)',
              }}
            >
              {trimTitle(postTitle, 120)}
            </span>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 8,
              }}
            >
              <span style={{ fontSize: 22, color: '#cbd5e1', fontWeight: 600 }}>
                crowdconscious.app
              </span>
              <span style={{ fontSize: 16, color: '#94a3b8', fontWeight: 600 }}>
                Crowd Conscious
              </span>
            </div>
          </div>
        </div>
      ),
      {
        width: WIDTH,
        height: HEIGHT,
        headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' },
      }
    )
  }

  // === Layout 3: Title card (no cover, no Pulse) ======================
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background:
            'linear-gradient(165deg, #0f1419 0%, #151c26 45%, #0f1419 100%)',
          padding: 64,
          fontFamily: 'system-ui, sans-serif',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <div
              style={{
                width: 64,
                height: 4,
                borderRadius: 2,
                backgroundColor: '#10b981',
              }}
            />
            <span
              style={{
                fontSize: 18,
                color: '#10b981',
                fontWeight: 700,
                letterSpacing: 2,
                textTransform: 'uppercase',
              }}
            >
              {cat}
            </span>
          </div>
          <span
            style={{
              fontSize: 56,
              color: '#ffffff',
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: -1,
              display: 'flex',
              marginTop: 18,
            }}
          >
            {trimTitle(postTitle, 130)}
          </span>
          {tldrLine ? (
            <span
              style={{
                fontSize: 26,
                color: '#cbd5e1',
                fontWeight: 500,
                lineHeight: 1.35,
                marginTop: 24,
                display: 'flex',
              }}
            >
              {trimTitle(tldrLine, 180)}
            </span>
          ) : null}
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid #2a3544',
            paddingTop: 22,
          }}
        >
          <span style={{ fontSize: 24, color: '#10b981', fontWeight: 700 }}>
            Crowd Conscious
          </span>
          <span style={{ fontSize: 18, color: '#64748b', fontWeight: 600 }}>
            crowdconscious.app
          </span>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' },
    }
  )
}

function BrandFallback() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background:
          'linear-gradient(165deg, #0f1419 0%, #151c26 45%, #0f1419 100%)',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        style={{
          width: 120,
          height: 4,
          borderRadius: 2,
          backgroundColor: '#10b981',
          marginBottom: 28,
        }}
      />
      <span style={{ fontSize: 56, fontWeight: 800 }}>Crowd Conscious</span>
      <span style={{ marginTop: 16, fontSize: 24, color: '#94a3b8' }}>
        Consultas con confianza ponderada
      </span>
    </div>
  )
}
