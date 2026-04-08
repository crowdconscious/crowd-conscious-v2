import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'
import { getMarketText, getOutcomeLabel } from '@/lib/i18n/market-translations'

type OutcomeRow = {
  label: string
  probability: unknown
  translations?: unknown
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug: rawSlug } = await params
  const slug = decodeURIComponent(rawSlug)
  const { searchParams } = new URL(request.url)
  const locale = searchParams.get('lang') === 'en' ? 'en' : 'es'

  const WIDTH = 1200
  const HEIGHT = 630

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: post } = await supabase
    .from('blog_posts')
    .select('title, title_en, pulse_market_id')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  const fallback = (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f1419',
        color: 'white',
        fontSize: 42,
        fontWeight: 700,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      Crowd Conscious
    </div>
  )

  if (!post?.pulse_market_id) {
    return new ImageResponse(fallback, {
      width: WIDTH,
      height: HEIGHT,
      headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' },
    })
  }

  const { data: market } = await supabase
    .from('prediction_markets')
    .select('id, title, translations, total_votes, engagement_count')
    .eq('id', post.pulse_market_id)
    .maybeSingle()

  if (!market) {
    return new ImageResponse(fallback, {
      width: WIDTH,
      height: HEIGHT,
      headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' },
    })
  }

  const { data: outcomes } = await supabase
    .from('market_outcomes')
    .select('label, probability, translations')
    .eq('market_id', post.pulse_market_id)
    .order('probability', { ascending: false })

  const outcomeRows = (outcomes ?? []) as OutcomeRow[]
  const sorted = [...outcomeRows].sort((a, b) => Number(b.probability) - Number(a.probability))
  const a = sorted[0]
  const b = sorted[1]
  const p1 = a ? Math.min(100, Math.max(0, Math.round(Number(a.probability) * 100))) : 0
  const p2 = b ? Math.min(100, Math.max(0, Math.round(Number(b.probability) * 100))) : 0
  const l1 = a ? getOutcomeLabel(a, locale) : '—'
  const l2 = b ? getOutcomeLabel(b, locale) : '—'

  const voteCount =
    Number((market as { total_votes?: number | null }).total_votes) ||
    Number((market as { engagement_count?: number | null }).engagement_count) ||
    0

  const displayTitle = getMarketText(market, 'title', locale)
  const blogTitle =
    locale === 'en' && (post as { title_en?: string | null }).title_en?.trim()
      ? String((post as { title_en?: string | null }).title_en)
      : post.title

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(165deg, #0f1419 0%, #1a2029 45%, #0f1419 100%)',
          padding: 56,
          fontFamily: 'system-ui, sans-serif',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <span style={{ fontSize: 22, color: '#10b981', fontWeight: 700 }}>Conscious Pulse</span>
          <span style={{ fontSize: 20, color: '#94a3b8', fontWeight: 500, lineHeight: 1.3 }}>
            {blogTitle}
          </span>
          <span style={{ marginTop: 8, fontSize: 36, color: '#f8fafc', fontWeight: 800, lineHeight: 1.2 }}>
            {displayTitle.length > 120 ? `${displayTitle.slice(0, 117)}…` : displayTitle}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 26, color: '#e2e8f0', fontWeight: 600, maxWidth: '72%' }}>{l1}</span>
              <span style={{ fontSize: 32, color: '#10b981', fontWeight: 800 }}>{p1}%</span>
            </div>
            {b ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 24, color: '#cbd5e1', fontWeight: 500, maxWidth: '72%' }}>{l2}</span>
                <span style={{ fontSize: 28, color: '#34d399', fontWeight: 700 }}>{p2}%</span>
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
