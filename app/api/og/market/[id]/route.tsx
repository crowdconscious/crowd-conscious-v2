import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { getMarketText, getOutcomeLabel } from '@/lib/i18n/market-translations'

// Node.js runtime (default) — no Edge

const CATEGORY_EMOJI: Record<string, string> = {
  world_cup: '⚽',
  world: '🌍',
  pulse: '📊',
  government: '🏛',
  geopolitics: '🌐',
  sustainability: '🌱',
  technology: '💻',
  economy: '📈',
  corporate: '🏢',
  community: '👥',
  cause: '💚',
  entertainment: '🎬',
}

const CATEGORY_LABELS: Record<string, string> = {
  world_cup: 'World Cup',
  world: 'World',
  pulse: 'Pulse',
  government: 'Government',
  geopolitics: 'Geopolitics',
  sustainability: 'Sustainability',
  technology: 'Technology',
  economy: 'Economy',
  corporate: 'Corporate',
  community: 'Community',
  cause: 'Cause',
  entertainment: 'Entertainment',
}

type OutcomeRow = {
  label: string
  probability: unknown
  translations?: unknown
}

function getCategoryDisplay(category: string | null | undefined, isPulse?: boolean): string {
  if (isPulse) return 'Conscious Pulse'
  if (!category) return 'Market'
  return CATEGORY_LABELS[category] ?? category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function getVoteSplit(
  market: { current_probability: number | string | null },
  outcomes: OutcomeRow[] | null | undefined,
  locale: string
): {
  line: string
  leftPct: number
  rightPct: number
  leftLabel: string
  rightLabel: string
  /** 0–100: left segment width for split bar */
  barLeftWidth: number
} {
  const outs = outcomes ?? []
  if (outs.length >= 2) {
    const sorted = [...outs].sort((a, b) => Number(b.probability) - Number(a.probability))
    const a = sorted[0]
    const b = sorted[1]
    const p1 = Math.min(100, Math.max(0, Math.round(Number(a.probability) * 100)))
    const p2 = Math.min(100, Math.max(0, Math.round(Number(b.probability) * 100)))
    const l1 = getOutcomeLabel(a, locale)
    const l2 = getOutcomeLabel(b, locale)
    const sum = p1 + p2
    const barLeftWidth = sum > 0 ? Math.round((p1 / sum) * 1000) / 10 : 50
    return {
      line: `${l1} ${p1}% · ${l2} ${p2}%`,
      leftPct: p1,
      rightPct: p2,
      leftLabel: l1,
      rightLabel: l2,
      barLeftWidth,
    }
  }
  const yesPct = Math.min(100, Math.max(0, Math.round(Number(market.current_probability ?? 50))))
  const noPct = 100 - yesPct
  return {
    line: `YES ${yesPct}% · NO ${noPct}%`,
    leftPct: yesPct,
    rightPct: noPct,
    leftLabel: 'YES',
    rightLabel: 'NO',
    barLeftWidth: yesPct,
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: marketId } = await params
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format')
    const locale = searchParams.get('lang') || 'es'
    const isStory = format === 'story'
    const WIDTH = isStory ? 1080 : 1200
    const HEIGHT = isStory ? 1920 : 630

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: market, error } = await supabase
      .from('prediction_markets')
      .select(
        'id, title, category, current_probability, total_votes, engagement_count, translations, sponsor_name, sponsor_logo_url, is_pulse'
      )
      .eq('id', marketId)
      .single()

    if (error || !market) {
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
          width: WIDTH,
          height: HEIGHT,
          headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' },
        }
      )
    }

    const { data: outcomes } = await supabase
      .from('market_outcomes')
      .select('label, probability, translations')
      .eq('market_id', marketId)
      .order('probability', { ascending: false })

    // Avg confidence (Pulse signature stat). Fast for typical Pulses
    // (≤ ~1k votes). We only need the numeric column.
    const isPulseQuery =
      Boolean((market as { is_pulse?: boolean }).is_pulse) || market.category === 'pulse'
    let avgConfidence: number | null = null
    let voteCount: number | null = null
    if (isPulseQuery) {
      const { data: voteRows } = await supabase
        .from('market_votes')
        .select('confidence')
        .eq('market_id', marketId)
        .limit(5000)
      if (voteRows && voteRows.length > 0) {
        const total = voteRows.reduce(
          (sum, v) => sum + (typeof v.confidence === 'number' ? v.confidence : 0),
          0
        )
        avgConfidence = total / voteRows.length
        voteCount = voteRows.length
      }
    }

    const outcomeRows = (outcomes ?? []) as OutcomeRow[]
    const sortedByProb = [...outcomeRows].sort((a, b) => Number(b.probability) - Number(a.probability))
    const probs = sortedByProb.map((o) => Number(o.probability))
    const multiOutcomeTie =
      sortedByProb.length > 2 &&
      probs.length > 0 &&
      probs.every((p) => Math.abs(p - probs[0]) < 1e-5)
    const topOutcome = sortedByProb[0]
    const probRaw = topOutcome?.probability ?? market.current_probability ?? 0.5
    let sponsorLogoBase64 = ''
    if ((market as { sponsor_logo_url?: string }).sponsor_logo_url) {
      try {
        const logoRes = await fetch((market as { sponsor_logo_url?: string }).sponsor_logo_url!)
        const logoBuffer = await logoRes.arrayBuffer()
        const base64 = Buffer.from(logoBuffer).toString('base64')
        const contentType = logoRes.headers.get('content-type') || 'image/png'
        sponsorLogoBase64 = `data:${contentType};base64,${base64}`
      } catch {
        /* skip logo in OG if fetch fails */
      }
    }
    const probability = Math.min(100, Math.max(0, Math.round(Number(probRaw) * 100)))
    const isPulseMarket =
      Boolean((market as { is_pulse?: boolean }).is_pulse) ||
      market.category === 'pulse'
    const outcomeName = multiOutcomeTie
      ? locale === 'es'
        ? 'Empate — sin líder aún'
        : 'Equal — no leader yet'
      : topOutcome
        ? getOutcomeLabel(topOutcome, locale)
        : probability >= 50
          ? 'Yes'
          : 'Undecided'
    const engagement = Number((market as { engagement_count?: number }).engagement_count) || Number(market.total_votes) || 0
    const totalVotesDisplay = voteCount ?? Number(market.total_votes) ?? 0
    // Localized "votes" / "votos" tag — defaults to ES, switches to EN
    // when ?lang=en is present (matches the rest of the OG copy).
    const votesLabel = locale === 'en' ? 'votes' : 'votos'
    const confidenceLabel = locale === 'en' ? 'confidence' : 'confianza'
    const pulseStatLine =
      avgConfidence != null
        ? `${totalVotesDisplay.toLocaleString()} ${votesLabel} · ${avgConfidence.toFixed(1)}/10 ${confidenceLabel}`
        : `${engagement.toLocaleString()} ${votesLabel}`
    const emoji = isPulseMarket ? '📊' : CATEGORY_EMOJI[market.category || ''] || '🔮'
    const displayTitle = getMarketText(market, 'title', locale)
    const titleLength = displayTitle.length
    const categoryDisplay = getCategoryDisplay(market.category, isPulseMarket)
    const split = getVoteSplit(market, outcomeRows, locale)
    const topThreeOutcomes = sortedByProb.slice(0, 3)

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
    } catch (err) {
      console.log('[OG] Could not load logo file, using text fallback')
    }

    const leftBarFlex = split.barLeftWidth
    const rightBarFlex = Math.round((100 - leftBarFlex) * 10) / 10

    if (isStory) {
      return new ImageResponse(
        (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              background: '#0f1419',
              padding: '72px 56px 100px',
              fontFamily: 'sans-serif',
              position: 'relative',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                justifyContent: 'flex-start',
                gap: '40px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  alignSelf: 'flex-start',
                  backgroundColor: 'rgba(16,185,129,0.15)',
                  border: '2px solid rgba(16,185,129,0.45)',
                  borderRadius: '16px',
                  padding: '12px 24px',
                  fontSize: '26px',
                  fontWeight: 700,
                  color: '#10b981',
                }}
              >
                {emoji} {categoryDisplay}
              </div>
              <div
                style={{
                  display: 'flex',
                  fontSize: titleLength > 90 ? '42px' : titleLength > 60 ? '48px' : '56px',
                  fontWeight: 800,
                  color: '#ffffff',
                  lineHeight: '1.15',
                  letterSpacing: '-0.5px',
                }}
              >
                {displayTitle.slice(0, 140)}{displayTitle.length > 140 ? '…' : ''}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', marginTop: '16px' }}>
                {outcomeRows.length > 2 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {topThreeOutcomes.map((o, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'baseline',
                          gap: '16px',
                          fontSize: '28px',
                          fontWeight: 800,
                          color: '#e2e8f0',
                          letterSpacing: '-0.3px',
                        }}
                      >
                        <span style={{ flex: 1, minWidth: 0 }}>{getOutcomeLabel(o, locale)}</span>
                        <span style={{ color: '#10b981', flexShrink: 0 }}>
                          {Math.round(Number(o.probability) * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        fontSize: '36px',
                        fontWeight: 800,
                        color: '#e2e8f0',
                        letterSpacing: '-0.3px',
                      }}
                    >
                      {split.line}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        width: '100%',
                        height: '28px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        backgroundColor: '#1e293b',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          width: `${leftBarFlex}%`,
                          height: '100%',
                          backgroundColor: '#10b981',
                        }}
                      />
                      <div
                        style={{
                          display: 'flex',
                          width: `${rightBarFlex}%`,
                          height: '100%',
                          backgroundColor: '#475569',
                        }}
                      />
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '22px',
                        fontWeight: 600,
                        color: '#94a3b8',
                      }}
                    >
                      <span style={{ color: '#10b981' }}>{split.leftLabel}</span>
                      <span style={{ color: '#94a3b8' }}>{split.rightLabel}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                width: '100%',
                paddingTop: '32px',
                borderTop: '1px solid rgba(16,185,129,0.25)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', fontSize: '28px', fontWeight: 700, color: '#10b981' }}>
                  {outcomeName}
                </div>
                <div style={{ display: 'flex', fontSize: '22px', color: '#64748b' }}>
                  {pulseStatLine}
                </div>
                <div style={{ display: 'flex', fontSize: '26px', fontWeight: 700, color: '#ffffff', marginTop: '8px' }}>
                  crowdconscious.app
                </div>
                {(market as { sponsor_name?: string }).sponsor_name ? (
                  <div
                    style={{
                      display: 'flex',
                      marginTop: '16px',
                      fontSize: '15px',
                      color: '#64748b',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    {sponsorLogoBase64 ? (
                      <img src={sponsorLogoBase64} alt="" width={20} height={20} style={{ display: 'flex', objectFit: 'contain', borderRadius: '4px' }} />
                    ) : null}
                    Sponsored by {(market as { sponsor_name?: string }).sponsor_name}
                  </div>
                ) : null}
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '4px' }}>
                {logoBase64 ? (
                  <img
                    src={logoBase64}
                    width={140}
                    height={42}
                    style={{ display: 'flex', objectFit: 'contain' }}
                    alt=""
                  />
                ) : (
                  <div style={{ display: 'flex', fontSize: '20px', fontWeight: 700, color: '#10b981' }}>CC</div>
                )}
              </div>
            </div>
          </div>
        ),
        { width: WIDTH, height: HEIGHT, headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' } }
      )
    }

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'row',
            background: '#0f1419',
            padding: '40px 48px',
            fontFamily: 'sans-serif',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '0',
              left: '0',
              width: '100%',
              height: '4px',
              background: 'linear-gradient(90deg, #10b981 0%, rgba(16,185,129,0.2) 100%)',
              display: 'flex',
            }}
          />
          {(market as { sponsor_name?: string }).sponsor_name && (
            <div
              style={{
                display: 'flex',
                position: 'absolute',
                bottom: '10px',
                left: '48px',
                fontSize: '12px',
                color: '#64748b',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {sponsorLogoBase64 ? (
                <img src={sponsorLogoBase64} alt="" width={20} height={20} style={{ display: 'flex', objectFit: 'contain', borderRadius: '4px' }} />
              ) : null}
              Sponsored by {(market as { sponsor_name?: string }).sponsor_name}
            </div>
          )}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: '1',
              paddingRight: '36px',
              justifyContent: 'space-between',
            }}
          >
            {logoBase64 ? (
              <img src={logoBase64} width={160} height={48} style={{ display: 'flex', objectFit: 'contain' }} alt="" />
            ) : (
              <div style={{ display: 'flex', fontSize: '22px', fontWeight: 700, color: '#10b981' }}>CROWD CONSCIOUS</div>
            )}
            <div style={{ display: 'flex', marginTop: '14px' }}>
              <div
                style={{
                  display: 'flex',
                  backgroundColor: 'rgba(16,185,129,0.15)',
                  border: '1px solid rgba(16,185,129,0.4)',
                  borderRadius: '14px',
                  padding: '8px 16px',
                  fontSize: '15px',
                  fontWeight: 700,
                  color: '#10b981',
                }}
              >
                {emoji} {categoryDisplay}
              </div>
            </div>
            <div style={{ display: 'flex', flex: '1', alignItems: 'center', marginTop: '10px' }}>
              <div
                style={{
                  display: 'flex',
                  fontSize: titleLength > 100 ? '32px' : titleLength > 60 ? '38px' : '44px',
                  fontWeight: 800,
                  color: '#ffffff',
                  lineHeight: '1.2',
                }}
              >
                {displayTitle.slice(0, 120)}{displayTitle.length > 120 ? '…' : ''}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
              {outcomeRows.length > 2 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {topThreeOutcomes.map((o, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        gap: '12px',
                        fontSize: '22px',
                        fontWeight: 700,
                        color: '#e2e8f0',
                        maxWidth: '100%',
                      }}
                    >
                      <span style={{ flex: 1, minWidth: 0 }}>{getOutcomeLabel(o, locale)}</span>
                      <span style={{ color: '#10b981', flexShrink: 0 }}>
                        {Math.round(Number(o.probability) * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', fontSize: '22px', fontWeight: 800, color: '#e2e8f0' }}>{split.line}</div>
                  <div
                    style={{
                      display: 'flex',
                      width: '100%',
                      maxWidth: '420px',
                      height: '14px',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      backgroundColor: '#1e293b',
                    }}
                  >
                    <div style={{ display: 'flex', width: `${leftBarFlex}%`, height: '100%', backgroundColor: '#10b981' }} />
                    <div style={{ display: 'flex', width: `${rightBarFlex}%`, height: '100%', backgroundColor: '#475569' }} />
                  </div>
                </>
              )}
              <div
                style={{
                  display: 'flex',
                  fontSize: '24px',
                  fontWeight: 800,
                  fontStyle: 'italic',
                  color: '#10b981',
                  marginTop: '6px',
                }}
              >
                ¿Y tú?
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '4px' }}>
                <div style={{ display: 'flex', fontSize: '13px', color: '#64748b' }}>
                  {pulseStatLine}
                </div>
                <div style={{ display: 'flex', fontSize: '14px', fontWeight: 600, color: '#94a3b8' }}>crowdconscious.app</div>
              </div>
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '260px',
              borderLeft: '1px solid rgba(16,185,129,0.2)',
              paddingLeft: '32px',
            }}
          >
            <div style={{ display: 'flex', fontSize: '48px', fontWeight: 800, color: '#10b981' }}>
              {multiOutcomeTie ? '—' : `${probability}%`}
            </div>
            <div style={{ display: 'flex', marginTop: '8px', fontSize: '18px', fontWeight: 700, color: '#94a3b8', textAlign: 'center' }}>
              {outcomeName}
            </div>
            {outcomeRows.length <= 2 ? (
              <>
                <div
                  style={{
                    display: 'flex',
                    width: '200px',
                    height: '8px',
                    marginTop: '20px',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    backgroundColor: '#1e293b',
                  }}
                >
                  <div style={{ display: 'flex', width: `${leftBarFlex}%`, height: '100%', backgroundColor: '#10b981' }} />
                  <div style={{ display: 'flex', width: `${rightBarFlex}%`, height: '100%', backgroundColor: '#475569' }} />
                </div>
                <div style={{ display: 'flex', marginTop: '12px', fontSize: '13px', color: '#64748b', textAlign: 'center' }}>
                  {split.leftLabel} · {split.rightLabel}
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', marginTop: '16px', fontSize: '13px', color: '#64748b', textAlign: 'center' }}>
                Top {Math.min(3, outcomeRows.length)} outcomes
              </div>
            )}
          </div>
        </div>
      ),
      { width: WIDTH, height: HEIGHT, headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' } }
    )
  } catch (e) {
    console.error('OG image error:', e)
    return new Response('Failed to generate image', { status: 500 })
  }
}
