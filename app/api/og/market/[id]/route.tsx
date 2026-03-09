import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'
import { readFile } from 'fs/promises'
import { join } from 'path'

// Node.js runtime (default) — no Edge

const CATEGORY_EMOJI: Record<string, string> = {
  world_cup: '⚽',
  world: '🌍',
  government: '🏛',
  sustainability: '🌱',
  corporate: '🏢',
  community: '👥',
  cause: '💚',
}

function getSentimentInfo(score: number): { label: string; color: string } {
  if (score < -30) return { label: 'Negativo', color: '#ef4444' }
  if (score < -10) return { label: 'Algo negativo', color: '#f97316' }
  if (score <= 10) return { label: 'Neutral', color: '#eab308' }
  if (score <= 30) return { label: 'Algo positivo', color: '#84cc16' }
  return { label: 'Positivo', color: '#22c55e' }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: marketId } = await params
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format')
    const isStory = format === 'story'
    const WIDTH = isStory ? 1080 : 1200
    const HEIGHT = isStory ? 1920 : 630

    let logoSrc = ''
    try {
      const logoPath = join(process.cwd(), 'public', 'images', 'logo.png')
      const logoData = await readFile(logoPath)
      logoSrc = `data:image/png;base64,${logoData.toString('base64')}`
    } catch {
      try {
        const logoSvgPath = join(process.cwd(), 'public', 'images', 'logo.svg')
        const logoSvgData = await readFile(logoSvgPath)
        logoSrc = `data:image/svg+xml;base64,${logoSvgData.toString('base64')}`
      } catch {
        // Use text fallback
      }
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: market, error } = await supabase
      .from('prediction_markets')
      .select('id, title, category, current_probability, total_votes')
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
              background: 'linear-gradient(150deg, #0a1628 0%, #0d1f2d 50%, #0a2e1f 100%)',
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

    const [{ data: outcomes }, { data: sentimentData }] = await Promise.all([
      supabase
        .from('market_outcomes')
        .select('label, probability')
        .eq('market_id', marketId)
        .order('probability', { ascending: false }),
      supabase
        .from('sentiment_scores')
        .select('score')
        .eq('market_id', marketId)
        .order('recorded_at', { ascending: false })
        .limit(1),
    ])

    const topOutcome = outcomes?.[0]
    const probability = topOutcome
      ? Math.round(Number(topOutcome.probability) * 100)
      : Math.round(Number(market.current_probability) || 50)
    const outcomeName = topOutcome?.label ?? 'Yes'
    const totalPredictions = market.total_votes ?? 0
    const emoji = CATEGORY_EMOJI[market.category || ''] || '🔮'
    const categoryLabel = (market.category || 'market').replace('_', ' ').toUpperCase()

    const latestSentiment = sentimentData?.[0] ? Number(sentimentData[0].score) : null
    const sentimentInfo = latestSentiment !== null ? getSentimentInfo(latestSentiment) : null

    const donutSize = isStory ? 200 : 120
    const donutInner = isStory ? 140 : 80
    const prob = Math.min(100, Math.max(0, probability))
    // Satori doesn't support conic-gradient; use SVG donut
    const r = Math.round(donutSize * 0.4)
    const strokeW = Math.round(donutSize * 0.15)
    const circumference = 2 * Math.PI * r
    const dashOffset = circumference - (circumference * prob) / 100
    const donutSvg = `data:image/svg+xml;base64,${Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${donutSize}" height="${donutSize}" viewBox="0 0 ${donutSize} ${donutSize}">
        <circle cx="${donutSize/2}" cy="${donutSize/2}" r="${r}" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="${strokeW}"/>
        <circle cx="${donutSize/2}" cy="${donutSize/2}" r="${r}" fill="none" stroke="#10b981" stroke-width="${strokeW}" stroke-dasharray="${circumference}" stroke-dashoffset="${dashOffset}" transform="rotate(-90 ${donutSize/2} ${donutSize/2})"/>
      </svg>`
    ).toString('base64')}`

    const cardContent = (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(150deg, #0a1628 0%, #0d1f2d 50%, #0a2e1f 100%)',
          padding: isStory ? '80px 60px' : '50px 60px',
          fontFamily: 'sans-serif',
          position: 'relative',
          borderBottom: '4px solid #10b981',
        }}
      >
        {/* Decorative gradient orb */}
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            right: '-100px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)',
            display: 'flex',
          }}
        />

        {isStory ? (
          /* Story layout: centered, vertical */
          <>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              {logoSrc ? (
                <img
                  src={logoSrc}
                  alt=""
                  width={200}
                  height={56}
                  style={{ display: 'flex', objectFit: 'contain' }}
                />
              ) : (
                <div
                  style={{
                    display: 'flex',
                    fontSize: '32px',
                    fontWeight: 'bold',
                    color: '#10b981',
                    letterSpacing: '-0.5px',
                  }}
                >
                  CROWD CONSCIOUS
                </div>
              )}
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: '40px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: 'rgba(16,185,129,0.15)',
                  borderRadius: '20px',
                  padding: '8px 20px',
                  fontSize: '20px',
                  color: '#10b981',
                }}
              >
                {`${emoji} ${categoryLabel}`}
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                flex: '1',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  fontSize: '48px',
                  fontWeight: 'bold',
                  color: '#ffffff',
                  lineHeight: '1.3',
                  maxWidth: '900px',
                  marginBottom: '48px',
                }}
              >
                {`${(market.title ?? '').slice(0, 120)}${(market.title?.length ?? 0) > 120 ? '…' : ''}`}
              </div>
              <div
                style={{
                  display: 'flex',
                  width: `${donutSize}px`,
                  height: `${donutSize}px`,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '40px',
                  position: 'relative',
                }}
              >
                <img src={donutSvg} alt="" width={donutSize} height={donutSize} style={{ display: 'flex', position: 'absolute' }} />
                <div
                  style={{
                    display: 'flex',
                    width: `${donutInner}px`,
                    height: `${donutInner}px`,
                    borderRadius: '50%',
                    backgroundColor: '#0d1f2d',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: isStory ? '48px' : '28px',
                    fontWeight: 'bold',
                    color: '#10b981',
                    zIndex: 1,
                  }}
                >
                  {probability}%
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  width: '100%',
                  height: '6px',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  borderRadius: '3px',
                  marginBottom: '32px',
                  maxWidth: '400px',
                  alignSelf: 'center',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    width: `${Math.min(100, Math.max(0, probability))}%`,
                    height: '100%',
                    backgroundColor: '#10b981',
                    borderRadius: '3px',
                  }}
                />
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '48px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    fontSize: '32px',
                    fontWeight: 'bold',
                    color: '#10b981',
                  }}
                >
                  {probability}% {outcomeName}
                </div>
                {sentimentInfo && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: sentimentInfo.color,
                        display: 'flex',
                      }}
                    />
                    <span style={{ fontSize: '18px', color: '#94a3b8' }}>
                      Sentimiento: {sentimentInfo.label}
                    </span>
                  </div>
                )}
                <div style={{ fontSize: '16px', color: '#64748b' }}>
                  {`${totalPredictions} prediction${totalPredictions !== 1 ? 's' : ''}`}
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffffff' }}>
                  What do you think?
                </div>
                <div style={{ fontSize: '20px', color: '#94a3b8' }}>crowdconscious.app</div>
              </div>
            </div>
          </>
        ) : (
          /* Standard layout: question left, donut right */
          <>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '30px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {logoSrc ? (
                  <img
                    src={logoSrc}
                    alt=""
                    width={180}
                    height={50}
                    style={{ display: 'flex', objectFit: 'contain' }}
                  />
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      fontSize: '28px',
                      fontWeight: 'bold',
                      color: '#10b981',
                      letterSpacing: '-0.5px',
                    }}
                  >
                    CROWD CONSCIOUS
                  </div>
                )}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: 'rgba(16,185,129,0.15)',
                  borderRadius: '20px',
                  padding: '8px 20px',
                  fontSize: '20px',
                  color: '#10b981',
                }}
              >
                {`${emoji} ${categoryLabel}`}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flex: '1',
                alignItems: 'center',
                gap: '40px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flex: '1',
                  flexDirection: 'column',
                  maxWidth: '65%',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    fontSize: (market.title?.length ?? 0) > 80 ? '34px' : '42px',
                    fontWeight: 'bold',
                    color: '#ffffff',
                    lineHeight: '1.3',
                  }}
                >
                  {`${(market.title ?? '').slice(0, 120)}${(market.title?.length ?? 0) > 120 ? '…' : ''}`}
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  width: `${donutSize}px`,
                  height: `${donutSize}px`,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  position: 'relative',
                }}
              >
                <img src={donutSvg} alt="" width={donutSize} height={donutSize} style={{ display: 'flex', position: 'absolute' }} />
                <div
                  style={{
                    display: 'flex',
                    width: `${donutInner}px`,
                    height: `${donutInner}px`,
                    borderRadius: '50%',
                    backgroundColor: '#0d1f2d',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px',
                    fontWeight: 'bold',
                    color: '#10b981',
                    zIndex: 1,
                  }}
                >
                  {probability}%
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                width: '100%',
                height: '6px',
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: '3px',
                marginTop: '24px',
                marginBottom: '20px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  width: `${Math.min(100, Math.max(0, probability))}%`,
                  height: '100%',
                  backgroundColor: '#10b981',
                  borderRadius: '3px',
                }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '24px' }}>
                <div
                  style={{
                    display: 'flex',
                    fontSize: '36px',
                    fontWeight: 'bold',
                    color: '#10b981',
                  }}
                >
                  {probability}% {outcomeName}
                </div>
                {sentimentInfo && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: sentimentInfo.color,
                        display: 'flex',
                      }}
                    />
                    <span style={{ fontSize: '16px', color: '#94a3b8' }}>
                      Sentimiento: {sentimentInfo.label}
                    </span>
                  </div>
                )}
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: '4px',
                }}
              >
                <div style={{ fontSize: '16px', color: '#64748b' }}>
                  {`${totalPredictions} prediction${totalPredictions !== 1 ? 's' : ''}`}
                </div>
                <div style={{ fontSize: '18px', color: '#94a3b8' }}>crowdconscious.app</div>
              </div>
            </div>
          </>
        )}
      </div>
    )

    return new ImageResponse(cardContent, {
      width: WIDTH,
      height: HEIGHT,
      headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' },
    })
  } catch (e) {
    console.error('OG image error:', e)
    return new Response('Failed to generate image', { status: 500 })
  }
}
