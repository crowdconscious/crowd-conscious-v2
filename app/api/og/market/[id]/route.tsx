import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const CATEGORY_LABELS: Record<string, string> = {
  world: 'World',
  government: 'Government',
  corporate: 'Corporate',
  community: 'Community',
  cause: 'Cause',
  world_cup: 'World Cup',
  sustainability: 'Sustainability',
}

export const runtime = 'edge'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: market, error } = await supabase
      .from('prediction_markets')
      .select('title, category, current_probability')
      .eq('id', id)
      .single()

    if (error || !market) {
      return new Response('Market not found', { status: 404 })
    }

    const prob = Math.round(Number(market.current_probability) || 50)
    const categoryLabel = CATEGORY_LABELS[market.category || ''] || 'Market'
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app'

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#020617',
            padding: 48,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {/* Logo - top left */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 32,
            }}
          >
            <img
              src={`${baseUrl}/images/logo.png`}
              alt=""
              width={40}
              height={40}
              style={{ borderRadius: 8 }}
            />
            <span
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: '#10b981',
                letterSpacing: '-0.02em',
              }}
            >
              Crowd Conscious
            </span>
          </div>

          {/* Category badge */}
          <div
            style={{
              display: 'flex',
              alignSelf: 'flex-start',
              padding: '8px 16px',
              backgroundColor: 'rgba(16, 185, 129, 0.2)',
              borderRadius: 999,
              marginBottom: 24,
            }}
          >
            <span style={{ fontSize: 14, color: '#34d399', fontWeight: 600 }}>
              {categoryLabel}
            </span>
          </div>

          {/* Market question */}
          <div
            style={{
              fontSize: 36,
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1.3,
              marginBottom: 40,
              flex: 1,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {market.title?.slice(0, 120)}
            {market.title && market.title.length > 120 ? '…' : ''}
          </div>

          {/* Bottom row: donut + CTA */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 32,
            }}
          >
            {/* Donut chart */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: `conic-gradient(#10b981 0% ${prob}%, #334155 ${prob}% 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    backgroundColor: '#020617',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: 24,
                      fontWeight: 700,
                      color: '#ffffff',
                    }}
                  >
                    {prob}%
                  </span>
                </div>
              </div>
              <span style={{ fontSize: 18, color: '#94a3b8' }}>YES</span>
            </div>

            {/* CTA */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 20px',
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                borderRadius: 12,
              }}
            >
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: '#34d399',
                }}
              >
                Make your prediction →
              </span>
              <span
                style={{
                  fontSize: 16,
                  color: '#94a3b8',
                }}
              >
                crowdconscious.app
              </span>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (e) {
    console.error('OG image error:', e)
    return new Response('Failed to generate image', { status: 500 })
  }
}
