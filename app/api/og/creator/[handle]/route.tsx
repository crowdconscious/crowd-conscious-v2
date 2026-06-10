import { ImageResponse } from 'next/og'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { createAdminClient } from '@/lib/supabase-admin'
import { CONSCIOUS_VALUE_OPTIONS, parseMetadataValues } from '@/lib/locations/conscious-values'
import { creatorTier, CREATOR_SCORE_REVEAL_THRESHOLD } from '@/lib/creators/types'
import { creatorCraftLabel } from '@/lib/creators/crafts'
import { normalizeHandle } from '@/lib/i18n/creator'

// Mirrors /api/og/location — Node runtime so we can read the local logo
// file and fetch the avatar as a buffer. Uses the admin client (instead of
// the anon client the location route uses) because the join needs
// `profiles`, which is not anon-readable; only public-safe columns are
// selected and the active-status gate is applied explicitly, matching the
// RLS policy on creator_certifications.
//
// Query params:
//   ?lang=en          — EN copy (ES default)
//   ?format=story     — 1080x1920 story PNG (same convention as /api/og/market)
//   ?variant=vote     — "Vota por mí" pre-verification card: votes-needed
//                       progress instead of the score (share-cards doc §6)

function scoreColor(score: number | null): string {
  if (score == null) return '#475569'
  if (score >= 8) return '#10b981'
  if (score >= 6) return '#f59e0b'
  return '#64748b'
}

function fallbackImage(width: number, height: number) {
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
      width,
      height,
      headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' },
    }
  )
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle: handleParam } = await params
    const { searchParams } = new URL(request.url)
    const locale = (searchParams.get('lang') === 'en' ? 'en' : 'es') as 'es' | 'en'
    const isStory = searchParams.get('format') === 'story'
    const isVoteVariant = searchParams.get('variant') === 'vote'
    const WIDTH = isStory ? 1080 : 1200
    const HEIGHT = isStory ? 1920 : 630

    const handle = normalizeHandle(handleParam)
    if (!handle) return fallbackImage(WIDTH, HEIGHT)

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('id, handle, full_name, avatar_url')
      .ilike('handle', handle)
      .eq('user_type', 'influencer')
      .maybeSingle()

    if (!profile) return fallbackImage(WIDTH, HEIGHT)

    const { data: cert } = await admin
      .from('creator_certifications')
      .select(
        'conscious_score, total_votes, certified_at, craft, craft_en, city, metadata, status'
      )
      .eq('profile_id', profile.id)
      .eq('status', 'active')
      .maybeSingle()

    // Non-active / revoked certifications render the brand fallback — the
    // shared PNG link must always reflect the current state.
    if (!cert) return fallbackImage(WIDTH, HEIGHT)

    const name = (profile.full_name as string | null) || `@${profile.handle}`
    const handleLine = profile.handle ? `@${profile.handle}` : ''
    const votes = Number(cert.total_votes ?? 0)
    const rawScore = cert.conscious_score as number | string | null
    const score = rawScore == null ? null : Number(rawScore)
    const scoreRevealed = score != null && votes >= CREATOR_SCORE_REVEAL_THRESHOLD
    const craft = creatorCraftLabel(
      cert.craft as string | null,
      cert.craft_en as string | null,
      locale
    )
    const city = (cert.city as string | null) ?? ''
    const valueKeys = parseMetadataValues(cert.metadata)
    const valueLabels = valueKeys
      .map((k) => CONSCIOUS_VALUE_OPTIONS.find((o) => o.key === k)?.label[locale])
      .filter((v): v is string => Boolean(v))
      .slice(0, 4)

    const tier = creatorTier({
      certified_at: cert.certified_at as string | null,
      conscious_score: score,
      total_votes: votes,
    })
    const tierLabel =
      tier === 'certified'
        ? locale === 'es'
          ? 'Creador Consciente Certificado'
          : 'Certified Conscious Creator'
        : tier === 'community_verified'
          ? locale === 'es'
            ? 'Verificado por la comunidad'
            : 'Community-Verified'
          : locale === 'es'
            ? 'Nominado'
            : 'Nominated'
    const tierColor =
      tier === 'certified' ? '#fbbf24' : tier === 'community_verified' ? '#10b981' : '#94a3b8'

    // The vote variant always leads with the ask, regardless of tier.
    const pillLabel = isVoteVariant
      ? locale === 'es'
        ? 'Vota por mí'
        : 'Vote for me'
      : tierLabel
    const pillColor = isVoteVariant ? '#10b981' : tierColor
    const avatarRingColor = isVoteVariant ? '#10b981' : tierColor

    // Fetch avatar as base64 so the circular crop renders reliably.
    let avatarBase64 = ''
    const avatarUrl = profile.avatar_url as string | null
    if (avatarUrl) {
      try {
        const res = await fetch(avatarUrl)
        if (res.ok) {
          const buf = await res.arrayBuffer()
          const contentType = res.headers.get('content-type') || 'image/jpeg'
          avatarBase64 = `data:${contentType};base64,${Buffer.from(buf).toString('base64')}`
        }
      } catch {
        // silent — initial letter fallback below
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

    const voteCta = isVoteVariant
      ? locale === 'es'
        ? '¿Soy un Creador Consciente? Vota aquí →'
        : 'Am I a Conscious Creator? Vote here →'
      : locale === 'es'
        ? '¿Es un Creador Consciente? Vota →'
        : 'Is this a Conscious Creator? Vote →'
    const voteLabel = locale === 'es' ? 'votos' : 'votes'
    const neededToReveal = Math.max(0, CREATOR_SCORE_REVEAL_THRESHOLD - votes)
    const scoreCaption = scoreRevealed
      ? 'Conscious Score'
      : locale === 'es'
        ? `${neededToReveal} ${neededToReveal === 1 ? 'voto' : 'votos'} para revelar`
        : `${neededToReveal} ${neededToReveal === 1 ? 'vote' : 'votes'} to reveal`

    // Vote variant: progress toward the reveal threshold (10) replaces the
    // score block — the card's job is to recruit voters, not show the number.
    const progressPct = Math.min(
      100,
      Math.round((votes / CREATOR_SCORE_REVEAL_THRESHOLD) * 100)
    )
    const progressCaption =
      neededToReveal > 0
        ? locale === 'es'
          ? `${neededToReveal} ${neededToReveal === 1 ? 'voto más' : 'votos más'} para revelar el Conscious Score`
          : `${neededToReveal} more vote${neededToReveal === 1 ? '' : 's'} to reveal the Conscious Score`
        : locale === 'es'
          ? 'Score revelado — tu voto sigue contando'
          : 'Score revealed — your vote still counts'

    const titleSize = name.length > 32 ? 52 : name.length > 22 ? 62 : 72
    const storyTitleSize = name.length > 32 ? 64 : name.length > 22 ? 76 : 88

    if (isStory) {
      return new ImageResponse(
        (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              background:
                'linear-gradient(180deg, rgba(16,185,129,0.16) 0%, #0f1419 38%, #0f1419 100%)',
              fontFamily: 'sans-serif',
              padding: '110px 72px 90px',
              justifyContent: 'space-between',
            }}
          >
            {/* Top — avatar + identity */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 36,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  width: 440,
                  height: 440,
                  borderRadius: 220,
                  overflow: 'hidden',
                  border: `12px solid ${avatarRingColor}`,
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#1e293b',
                }}
              >
                {avatarBase64 ? (
                  <img
                    src={avatarBase64}
                    width={440}
                    height={440}
                    alt=""
                    style={{ display: 'flex', objectFit: 'cover', width: 440, height: 440 }}
                  />
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      fontSize: 200,
                      fontWeight: 800,
                      color: '#10b981',
                    }}
                  >
                    {name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  padding: '14px 32px',
                  borderRadius: 999,
                  background: isVoteVariant
                    ? 'rgba(16,185,129,0.15)'
                    : tier === 'certified'
                      ? 'rgba(251,191,36,0.14)'
                      : tier === 'community_verified'
                        ? 'rgba(16,185,129,0.15)'
                        : 'rgba(148,163,184,0.12)',
                  border: `2px solid ${pillColor}`,
                  color: pillColor,
                  fontSize: 32,
                  fontWeight: 700,
                }}
              >
                {pillLabel}
              </div>

              <div
                style={{
                  display: 'flex',
                  fontSize: storyTitleSize,
                  fontWeight: 800,
                  color: '#ffffff',
                  lineHeight: 1.05,
                  letterSpacing: -1,
                  textAlign: 'center',
                  justifyContent: 'center',
                }}
              >
                {name}
              </div>

              <div
                style={{
                  display: 'flex',
                  fontSize: 36,
                  color: '#94a3b8',
                  textAlign: 'center',
                  justifyContent: 'center',
                }}
              >
                {handleLine}
                {craft ? ` · ${craft}` : ''}
                {city ? ` · ${city}` : ''}
              </div>

              {valueLabels.length > 0 ? (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 14,
                    justifyContent: 'center',
                    maxWidth: 880,
                  }}
                >
                  {valueLabels.map((label) => (
                    <div
                      key={label}
                      style={{
                        display: 'flex',
                        padding: '10px 24px',
                        borderRadius: 999,
                        background: 'rgba(16,185,129,0.1)',
                        border: '1px solid rgba(16,185,129,0.35)',
                        color: '#34d399',
                        fontSize: 28,
                        fontWeight: 600,
                      }}
                    >
                      {label}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Middle — score or votes-needed progress */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 28,
              }}
            >
              {isVoteVariant || !scoreRevealed ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 24,
                    width: '100%',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      fontSize: 44,
                      fontWeight: 800,
                      color: '#ffffff',
                    }}
                  >
                    {votes} {voteLabel}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      width: 760,
                      height: 26,
                      borderRadius: 13,
                      overflow: 'hidden',
                      backgroundColor: '#1e293b',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        width: `${progressPct}%`,
                        height: '100%',
                        backgroundColor: '#10b981',
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', fontSize: 30, color: '#94a3b8' }}>
                    {progressCaption}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '20px 36px',
                      borderRadius: 24,
                      background: scoreColor(score),
                      color: 'white',
                      minWidth: 200,
                    }}
                  >
                    <div style={{ display: 'flex', fontSize: 72, fontWeight: 800, lineHeight: 1 }}>
                      {score!.toFixed(1)}
                    </div>
                    <div style={{ display: 'flex', fontSize: 28, opacity: 0.85, marginTop: 4 }}>
                      / 10
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', fontSize: 40, fontWeight: 700, color: '#ffffff' }}>
                      {votes} {voteLabel}
                    </div>
                    <div style={{ display: 'flex', fontSize: 26, color: '#64748b' }}>
                      {scoreCaption}
                    </div>
                  </div>
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  fontSize: 40,
                  fontWeight: 700,
                  color: '#10b981',
                  textAlign: 'center',
                  justifyContent: 'center',
                }}
              >
                {voteCta}
              </div>
            </div>

            {/* Footer — URL + brand */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTop: '1px solid rgba(148,163,184,0.2)',
                paddingTop: 36,
              }}
            >
              <div style={{ display: 'flex', fontSize: 32, fontWeight: 700, color: '#ffffff' }}>
                crowdconscious.app/creators/{profile.handle ?? handle}
              </div>
              {logoBase64 ? (
                <img
                  src={logoBase64}
                  width={180}
                  height={54}
                  alt=""
                  style={{ display: 'flex', objectFit: 'contain' }}
                />
              ) : (
                <div
                  style={{
                    display: 'flex',
                    fontSize: 26,
                    fontWeight: 700,
                    color: '#10b981',
                    letterSpacing: 1,
                  }}
                >
                  CROWD CONSCIOUS
                </div>
              )}
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
          {/* Left column — avatar-forward */}
          <div
            style={{
              display: 'flex',
              width: '420px',
              height: '100%',
              alignItems: 'center',
              justifyContent: 'center',
              background:
                'linear-gradient(135deg, rgba(16,185,129,0.18) 0%, rgba(15,20,25,0.9) 100%)',
            }}
          >
            <div
              style={{
                display: 'flex',
                width: 300,
                height: 300,
                borderRadius: 150,
                overflow: 'hidden',
                border: `8px solid ${avatarRingColor}`,
                alignItems: 'center',
                justifyContent: 'center',
                background: '#1e293b',
              }}
            >
              {avatarBase64 ? (
                <img
                  src={avatarBase64}
                  width={300}
                  height={300}
                  alt=""
                  style={{ display: 'flex', objectFit: 'cover', width: 300, height: 300 }}
                />
              ) : (
                <div
                  style={{
                    display: 'flex',
                    fontSize: 140,
                    fontWeight: 800,
                    color: '#10b981',
                  }}
                >
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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

              {/* Tier seal — or the "Vota por mí" ask in the vote variant */}
              <div
                style={{
                  display: 'flex',
                  alignSelf: 'flex-start',
                  padding: '6px 16px',
                  borderRadius: 999,
                  background: isVoteVariant
                    ? 'rgba(16,185,129,0.15)'
                    : tier === 'certified'
                      ? 'rgba(251,191,36,0.14)'
                      : tier === 'community_verified'
                        ? 'rgba(16,185,129,0.15)'
                        : 'rgba(148,163,184,0.12)',
                  border: `1px solid ${pillColor}`,
                  color: pillColor,
                  fontSize: 18,
                  fontWeight: 700,
                }}
              >
                {pillLabel}
              </div>

              <div
                style={{
                  display: 'flex',
                  fontSize: titleSize,
                  fontWeight: 800,
                  color: '#ffffff',
                  lineHeight: 1.05,
                  letterSpacing: -1,
                }}
              >
                {name}
              </div>

              <div style={{ display: 'flex', fontSize: 24, color: '#94a3b8' }}>
                {handleLine}
                {craft ? ` · ${craft}` : ''}
                {city ? ` · ${city}` : ''}
              </div>

              {valueLabels.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 6 }}>
                  {valueLabels.map((label) => (
                    <div
                      key={label}
                      style={{
                        display: 'flex',
                        padding: '5px 14px',
                        borderRadius: 999,
                        background: 'rgba(16,185,129,0.1)',
                        border: '1px solid rgba(16,185,129,0.35)',
                        color: '#34d399',
                        fontSize: 17,
                        fontWeight: 600,
                      }}
                    >
                      {label}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Bottom row — score (or vote progress) + CTA */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                borderTop: '1px solid rgba(148,163,184,0.2)',
                paddingTop: 20,
              }}
            >
              {isVoteVariant ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 420 }}>
                  <div style={{ display: 'flex', fontSize: 26, fontWeight: 800, color: '#ffffff' }}>
                    {votes} {voteLabel}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      width: 360,
                      height: 14,
                      borderRadius: 7,
                      overflow: 'hidden',
                      backgroundColor: '#1e293b',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        width: `${progressPct}%`,
                        height: '100%',
                        backgroundColor: '#10b981',
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', fontSize: 15, color: '#94a3b8' }}>
                    {progressCaption}
                  </div>
                </div>
              ) : (
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
              )}
              <div
                style={{
                  display: 'flex',
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#10b981',
                  maxWidth: 300,
                  textAlign: 'right',
                }}
              >
                {voteCta}
              </div>
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
  } catch (e) {
    console.error('[OG creator] error:', e)
    return new Response('Failed to generate image', { status: 500 })
  }
}
