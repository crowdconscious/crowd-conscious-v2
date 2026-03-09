import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'

const WIDTH = 1200
const HEIGHT = 630

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
              background: 'linear-gradient(135deg, #0a1628 0%, #0f2027 50%, #0a1628 100%)',
              color: 'white',
              fontSize: 48,
              fontWeight: 'bold',
            }}
          >
            Crowd Conscious
          </div>
        ),
        { width: WIDTH, height: HEIGHT }
      )
    }

    const { data: outcomes } = await supabase
      .from('market_outcomes')
      .select('label, probability')
      .eq('market_id', marketId)
      .order('probability', { ascending: false })

    const topOutcome = outcomes?.[0]
    const probability = topOutcome
      ? Math.round(Number(topOutcome.probability) * 100)
      : Math.round(Number(market.current_probability) || 50)
    const outcomeName = topOutcome?.label ?? 'Yes'
    const totalPredictions = market.total_votes ?? 0
    const emoji = CATEGORY_EMOJI[market.category || ''] || '🔮'
    const categoryLabel = (market.category || 'market').replace('_', ' ').toUpperCase()

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: 'linear-gradient(135deg, #0a1628 0%, #0d1f2d 40%, #0a2e1f 100%)',
            padding: '50px 60px',
            fontFamily: 'sans-serif',
            position: 'relative',
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
              background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)',
              display: 'flex',
            }}
          />

          {/* Top bar: Logo + Category */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '30px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                fontSize: '28px',
                fontWeight: 'bold',
                color: '#10b981',
                letterSpacing: '-0.5px',
              }}
            >
              CROWD CONSCIOUS
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
              {emoji} {categoryLabel}
            </div>
          </div>

          {/* Market Question */}
          <div
            style={{
              display: 'flex',
              flex: '1',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                fontSize: (market.title?.length ?? 0) > 80 ? '36px' : '44px',
                fontWeight: 'bold',
                color: '#ffffff',
                lineHeight: '1.3',
                maxWidth: '750px',
              }}
            >
              {market.title?.slice(0, 120)}
              {(market.title?.length ?? 0) > 120 ? '…' : ''}
            </div>
          </div>

          {/* Bottom: Probability + Stats */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  fontSize: '18px',
                  color: '#94a3b8',
                  marginBottom: '8px',
                  display: 'flex',
                }}
              >
                Current crowd consensus
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                <div
                  style={{
                    fontSize: '72px',
                    fontWeight: 'bold',
                    color: '#10b981',
                    lineHeight: '1',
                    display: 'flex',
                  }}
                >
                  {probability}%
                </div>
                <div
                  style={{
                    fontSize: '28px',
                    color: '#e2e8f0',
                    display: 'flex',
                  }}
                >
                  {outcomeName}
                </div>
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: '8px',
              }}
            >
              <div
                style={{
                  fontSize: '16px',
                  color: '#64748b',
                  display: 'flex',
                }}
              >
                {totalPredictions} prediction{totalPredictions !== 1 ? 's' : ''}
              </div>
              <div
                style={{
                  fontSize: '18px',
                  color: '#94a3b8',
                  display: 'flex',
                }}
              >
                crowdconscious.app
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div
            style={{
              display: 'flex',
              width: '100%',
              height: '6px',
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: '3px',
              marginTop: '20px',
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
        </div>
      ),
      { width: WIDTH, height: HEIGHT }
    )
  } catch (e) {
    console.error('OG image error:', e)
    return new Response('Failed to generate image', { status: 500 })
  }
}
