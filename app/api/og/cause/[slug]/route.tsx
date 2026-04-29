import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

// 1200×630 Open Graph card for a Conscious Fund cause. Mirrors the blog +
// market OG routes: dark gradient, emerald accents, Supabase anon client,
// Node default runtime. Short CDN cache so the number updates as votes
// come in without hammering the DB.

type CauseRow = {
  id: string
  slug: string
  name: string
  organization: string | null
  category: string | null
  short_description: string | null
  description: string | null
  logo_url: string | null
  cover_image_url: string | null
  image_url: string | null
  verified: boolean
  city: string | null
  active: boolean
}

const WIDTH = 1200
const HEIGHT = 630

const CATEGORY_EMOJI: Record<string, string> = {
  water: '💧',
  education: '📚',
  environment: '🌱',
  social_justice: '⚖️',
  health: '❤️',
  mobility: '🚲',
  housing: '🏠',
  hunger: '🍲',
  culture: '🎭',
  emergency: '🚨',
  other: '✨',
}

function formatMoneyMxn(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '$0 MXN'
  return `$${Math.round(n).toLocaleString('es-MX')} MXN`
}

function truncate(input: string, max: number): string {
  if (input.length <= max) return input
  return `${input.slice(0, max - 1).trimEnd()}…`
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug: rawSlug } = await params
  const slug = decodeURIComponent(rawSlug)
  const { searchParams } = new URL(request.url)
  const locale = searchParams.get('lang') === 'en' ? 'en' : 'es'

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

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
        fontSize: 48,
        fontWeight: 800,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      Crowd Conscious · Fondo Consciente
    </div>
  )

  const { data: causeRaw } = await supabase
    .from('fund_causes')
    .select(
      'id, slug, name, organization, category, short_description, description, logo_url, cover_image_url, image_url, verified, city, active'
    )
    .eq('slug', slug)
    .maybeSingle()

  const cause = causeRaw as CauseRow | null

  if (!cause || cause.active === false) {
    return new ImageResponse(fallback, {
      width: WIDTH,
      height: HEIGHT,
      headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' },
    })
  }

  const cycle = new Date().toISOString().slice(0, 7) // YYYY-MM

  const [cycleVotesRes, fundRes] = await Promise.all([
    supabase
      .from('fund_votes')
      .select('id', { count: 'exact', head: true })
      .eq('cause_id', cause.id)
      .eq('cycle', cycle),
    supabase
      .from('conscious_fund')
      .select('current_balance')
      .limit(1)
      .maybeSingle(),
  ])

  const cycleVotes = cycleVotesRes.count ?? 0
  const fundBalance = Number(
    (fundRes.data as { current_balance?: number | null } | null)?.current_balance ?? 0
  )

  const emoji = CATEGORY_EMOJI[cause.category ?? ''] ?? CATEGORY_EMOJI.other
  const logo = cause.logo_url
  const shortDesc = cause.short_description || cause.description?.slice(0, 140) || ''
  const formattedVotes = cycleVotes.toLocaleString(locale === 'es' ? 'es-MX' : 'en-US')

  // Copy strings
  const L = (es: string, en: string) => (locale === 'es' ? es : en)
  const votesThisCycleLabel = L('Votos este ciclo', 'Votes this cycle')
  const supportedByLabel = L(
    `Apoyada por ${formattedVotes} ${cycleVotes === 1 ? 'voto' : 'votos'}`,
    `Supported by ${formattedVotes} ${cycleVotes === 1 ? 'opinion' : 'opinions'}`
  )
  const fundLine =
    fundBalance > 0
      ? L(
          `Hasta ${formatMoneyMxn(fundBalance)} si gana este ciclo`,
          `Up to ${formatMoneyMxn(fundBalance)} if it wins this cycle`
        )
      : L('Fondo Consciente · asignación mensual', 'Conscious Fund · monthly allocation')
  const verifiedLabel = L('✓ Verificada', '✓ Verified')
  const footerUrl = `crowdconscious.app/fund/causes/${cause.slug}`

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          background:
            'linear-gradient(165deg, #0f1419 0%, #1a2029 45%, #0f1419 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Top emerald accent stripe */}
        <div
          style={{
            display: 'flex',
            height: 6,
            width: '100%',
            background:
              'linear-gradient(90deg, #10b981 0%, #34d399 50%, #10b981 100%)',
          }}
        />

        {/* Main content row */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            padding: '44px 56px',
            gap: 40,
          }}
        >
          {/* Left column — 60% */}
          <div
            style={{
              width: '60%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logo}
                    alt=""
                    width={72}
                    height={72}
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 14,
                      objectFit: 'cover',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 14,
                      background: 'rgba(16,185,129,0.12)',
                      border: '1px solid rgba(16,185,129,0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 40,
                    }}
                  >
                    {emoji}
                  </div>
                )}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      fontSize: 18,
                      color: '#10b981',
                      fontWeight: 700,
                      letterSpacing: 1,
                      textTransform: 'uppercase',
                    }}
                  >
                    {L('Fondo Consciente', 'Conscious Fund')}
                  </span>
                  {cause.verified && (
                    <span
                      style={{
                        display: 'flex',
                        fontSize: 14,
                        color: '#34d399',
                        fontWeight: 600,
                      }}
                    >
                      {verifiedLabel}
                    </span>
                  )}
                </div>
              </div>

              <span
                style={{
                  fontSize: 52,
                  color: '#f8fafc',
                  fontWeight: 800,
                  lineHeight: 1.1,
                }}
              >
                {truncate(cause.name, 40)}
              </span>

              {cause.organization && (
                <span
                  style={{
                    fontSize: 22,
                    color: '#5eead4',
                    fontWeight: 600,
                  }}
                >
                  {truncate(cause.organization, 60)}
                </span>
              )}

              {shortDesc && (
                <span
                  style={{
                    fontSize: 20,
                    color: '#94a3b8',
                    fontWeight: 500,
                    lineHeight: 1.35,
                    marginTop: 4,
                  }}
                >
                  {truncate(shortDesc, 160)}
                </span>
              )}
            </div>
          </div>

          {/* Right column — 40% */}
          <div
            style={{
              width: '40%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: 18,
              padding: '24px 20px',
              borderLeft: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <span
              style={{
                fontSize: 14,
                color: '#94a3b8',
                fontWeight: 600,
                letterSpacing: 0.8,
                textTransform: 'uppercase',
              }}
            >
              {votesThisCycleLabel}
            </span>
            <span
              style={{
                fontSize: 88,
                color: '#10b981',
                fontWeight: 800,
                lineHeight: 1,
              }}
            >
              {formattedVotes}
            </span>
            <span
              style={{
                fontSize: 18,
                color: '#cbd5e1',
                fontWeight: 500,
              }}
            >
              {supportedByLabel}
            </span>
            <span
              style={{
                fontSize: 16,
                color: '#facc15',
                fontWeight: 600,
                marginTop: 8,
              }}
            >
              {fundLine}
            </span>
          </div>
        </div>

        {/* Footer strip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 56px',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            background: 'rgba(0,0,0,0.25)',
          }}
        >
          <span
            style={{
              fontSize: 18,
              color: '#e2e8f0',
              fontWeight: 600,
            }}
          >
            {footerUrl}
          </span>
          <span
            style={{
              fontSize: 14,
              color: '#64748b',
              fontWeight: 600,
              letterSpacing: 0.6,
              textTransform: 'uppercase',
            }}
          >
            Crowd Conscious
          </span>
        </div>

        {/* Bottom emerald accent stripe */}
        <div
          style={{
            display: 'flex',
            height: 6,
            width: '100%',
            background:
              'linear-gradient(90deg, #10b981 0%, #34d399 50%, #10b981 100%)',
          }}
        />
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      headers: {
        // 5-minute CDN cache with 10-minute SWR — lets the vote count
        // catch up without hammering Supabase for every fetch.
        'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=600',
      },
    }
  )
}
