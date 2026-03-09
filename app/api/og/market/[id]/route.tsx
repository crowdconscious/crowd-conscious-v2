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

    const { data: outcomes } = await supabase
      .from('market_outcomes')
      .select('label, probability')
      .eq('market_id', marketId)
      .order('probability', { ascending: false })

    const topOutcome = outcomes?.[0]
    const probRaw = topOutcome?.probability ?? market.current_probability ?? 0.5
    const probability = Math.min(100, Math.max(0, Math.round(Number(probRaw) * 100)))
    const outcomeName = topOutcome?.label ?? (probability >= 50 ? 'Yes' : 'Undecided')
    const totalPredictions = market.total_votes ?? 0
    const emoji = CATEGORY_EMOJI[market.category || ''] || '🔮'
    const titleLength = (market.title ?? '').length

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

    // Satori doesn't support conic-gradient; use SVG donut
    const donutSize = isStory ? 220 : 160
    const donutInner = isStory ? 155 : 110
    const r = Math.round(donutSize * 0.4)
    const strokeW = Math.round(donutSize * 0.15)
    const circumference = 2 * Math.PI * r
    const dashOffset = circumference - (circumference * probability) / 100
    const donutSvg = `data:image/svg+xml;base64,${Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${donutSize}" height="${donutSize}" viewBox="0 0 ${donutSize} ${donutSize}">
        <circle cx="${donutSize/2}" cy="${donutSize/2}" r="${r}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="${strokeW}"/>
        <circle cx="${donutSize/2}" cy="${donutSize/2}" r="${r}" fill="none" stroke="#10b981" stroke-width="${strokeW}" stroke-dasharray="${circumference}" stroke-dashoffset="${dashOffset}" transform="rotate(-90 ${donutSize/2} ${donutSize/2})"/>
      </svg>`
    ).toString('base64')}`

    if (isStory) {
      return new ImageResponse(
        (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: 'linear-gradient(180deg, #0a1628 0%, #0d1f2d 40%, #0a2e1f 100%)',
              padding: '80px 60px',
              fontFamily: 'sans-serif',
              position: 'relative',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '200px',
                right: '-100px',
                width: '500px',
                height: '500px',
                borderRadius: '250px',
                background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)',
                display: 'flex',
              }}
            />
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: '100%',
              }}
            >
              {logoBase64 ? (
                <img
                  src={logoBase64}
                  width={200}
                  height={60}
                  style={{ display: 'flex', objectFit: 'contain' }}
                  alt=""
                />
              ) : (
                <div
                  style={{
                    display: 'flex',
                    fontSize: '28px',
                    fontWeight: 700,
                    color: '#10b981',
                  }}
                >
                  CROWD CONSCIOUS
                </div>
              )}
              <div
                style={{
                  display: 'flex',
                  marginTop: '24px',
                  backgroundColor: 'rgba(16,185,129,0.12)',
                  borderRadius: '20px',
                  padding: '8px 24px',
                  fontSize: '18px',
                  fontWeight: 600,
                  color: '#10b981',
                }}
              >
                {emoji} {(market.category || 'market').replace('_', ' ').toUpperCase()}
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                maxWidth: '900px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  fontSize: titleLength > 80 ? '44px' : '54px',
                  fontWeight: 700,
                  color: '#ffffff',
                  lineHeight: '1.2',
                  textAlign: 'center',
                  justifyContent: 'center',
                }}
              >
                {(market.title ?? '').slice(0, 120)}{(market.title?.length ?? 0) > 120 ? '…' : ''}
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  width: '220px',
                  height: '220px',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <img src={donutSvg} alt="" width={220} height={220} style={{ display: 'flex', position: 'absolute' }} />
                <div
                  style={{
                    display: 'flex',
                    width: '155px',
                    height: '155px',
                    borderRadius: '80px',
                    backgroundColor: '#0d1f2d',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '52px',
                    fontWeight: 700,
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
                  marginTop: '20px',
                  fontSize: '28px',
                  fontWeight: 700,
                  color: '#10b981',
                }}
              >
                {outcomeName}
              </div>
              <div
                style={{
                  display: 'flex',
                  marginTop: '8px',
                  fontSize: '18px',
                  color: '#64748b',
                }}
              >
                {totalPredictions} prediction{totalPredictions !== 1 ? 's' : ''}
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  fontSize: '26px',
                  fontWeight: 600,
                  color: '#ffffff',
                }}
              >
                What do you think?
              </div>
              <div
                style={{
                  display: 'flex',
                  marginTop: '12px',
                  fontSize: '20px',
                  color: '#94a3b8',
                }}
              >
                crowdconscious.app
              </div>
            </div>
            <div
              style={{
                position: 'absolute',
                bottom: '0',
                left: '0',
                width: '100%',
                height: '4px',
                background: 'linear-gradient(90deg, transparent, #10b981, transparent)',
                display: 'flex',
              }}
            />
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
            background: 'linear-gradient(150deg, #0a1628 0%, #0d1f2d 50%, #0a2e1f 100%)',
            padding: '48px 56px',
            fontFamily: 'sans-serif',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '-80px',
              right: '-80px',
              width: '350px',
              height: '350px',
              borderRadius: '200px',
              background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)',
              display: 'flex',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '0',
              left: '0',
              width: '100%',
              height: '4px',
              background: 'linear-gradient(90deg, #10b981 0%, rgba(16,185,129,0.3) 100%)',
              display: 'flex',
            }}
          />
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: '1',
              paddingRight: '40px',
              justifyContent: 'space-between',
            }}
          >
            {logoBase64 ? (
              <img
                src={logoBase64}
                width={180}
                height={54}
                style={{ display: 'flex', objectFit: 'contain' }}
                alt=""
              />
            ) : (
              <div
                style={{
                  display: 'flex',
                  fontSize: '24px',
                  fontWeight: 700,
                  color: '#10b981',
                  letterSpacing: '-0.5px',
                }}
              >
                CROWD CONSCIOUS
              </div>
            )}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                marginTop: '16px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  backgroundColor: 'rgba(16,185,129,0.12)',
                  borderRadius: '16px',
                  padding: '6px 16px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#10b981',
                  letterSpacing: '0.5px',
                }}
              >
                {emoji} {(market.category || 'market').replace('_', ' ').toUpperCase()}
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                flex: '1',
                alignItems: 'center',
                marginTop: '8px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  fontSize: titleLength > 100 ? '28px' : titleLength > 60 ? '34px' : '40px',
                  fontWeight: 700,
                  color: '#ffffff',
                  lineHeight: '1.25',
                }}
              >
                {(market.title ?? '').slice(0, 120)}{(market.title?.length ?? 0) > 120 ? '…' : ''}
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '24px',
                marginTop: '12px',
              }}
            >
              <div style={{ display: 'flex', fontSize: '14px', color: '#64748b' }}>
                {totalPredictions} prediction{totalPredictions !== 1 ? 's' : ''}
              </div>
              <div style={{ display: 'flex', fontSize: '14px', color: '#64748b' }}>
                crowdconscious.app
              </div>
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '280px',
            }}
          >
            <div
              style={{
                display: 'flex',
                width: '160px',
                height: '160px',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              <img src={donutSvg} alt="" width={160} height={160} style={{ display: 'flex', position: 'absolute' }} />
              <div
                style={{
                  display: 'flex',
                  width: '110px',
                  height: '110px',
                  borderRadius: '55px',
                  backgroundColor: '#0d1f2d',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '36px',
                  fontWeight: 700,
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
                marginTop: '16px',
                fontSize: '22px',
                fontWeight: 700,
                color: '#10b981',
              }}
            >
              {outcomeName}
            </div>
            <div
              style={{
                display: 'flex',
                width: '200px',
                height: '4px',
                backgroundColor: 'rgba(255,255,255,0.08)',
                borderRadius: '2px',
                marginTop: '16px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  width: `${probability}%`,
                  height: '4px',
                  backgroundColor: '#10b981',
                  borderRadius: '2px',
                }}
              />
            </div>
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
