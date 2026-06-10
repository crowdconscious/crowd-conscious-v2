import { ImageResponse } from 'next/og'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { createSignalsAdminClient } from '@/lib/signals/supabase'
import {
  getCitizenSignalsCopy,
  SIGNAL_CATEGORIES,
  SIGNAL_SEVERITIES,
  SIGNAL_POST_TYPES,
  type SignalCategory,
  type SignalSeverity,
  type SignalPostType,
} from '@/lib/i18n/citizen-signals'

// Mirrors /api/og/location — Node runtime so we can read the local logo
// file and fetch the evidence image with a buffer. Uses the signals admin
// client because evidence lives behind RLS in a private bucket: the cover
// must be signed server-side immediately before fetch (stored URLs expire).

function severityColor(sev: SignalSeverity): string {
  if (sev === 'critical') return '#ef4444'
  if (sev === 'high') return '#f97316'
  if (sev === 'medium') return '#f59e0b'
  return '#64748b'
}

function fallbackCard(width: number, height: number) {
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
  { params }: { params: Promise<{ slug: string }> }
) {
  // Same gate as the rest of the signals surface (page metadata, API routes).
  if (process.env.SIGNALS_ENABLED !== 'true') {
    return new Response('Not found', { status: 404 })
  }

  try {
    const { slug } = await params
    const { searchParams } = new URL(request.url)
    const locale = (searchParams.get('lang') === 'en' ? 'en' : 'es') as 'es' | 'en'
    const t = getCitizenSignalsCopy(locale)

    const admin = createSignalsAdminClient()

    const { data: signal, error } = await admin
      .from('citizen_signals_public')
      .select(
        'id, title, post_type, category, severity, cosign_count, anonymous_support_count, threshold_stage'
      )
      .eq('public_slug', slug)
      .maybeSingle()

    if (error || !signal) {
      return fallbackCard(1200, 630)
    }

    const category = (
      SIGNAL_CATEGORIES.includes(signal.category as SignalCategory)
        ? signal.category
        : 'other'
    ) as SignalCategory
    const severity = (
      SIGNAL_SEVERITIES.includes(signal.severity as SignalSeverity)
        ? signal.severity
        : 'low'
    ) as SignalSeverity
    const postType = (
      SIGNAL_POST_TYPES.includes(signal.post_type as SignalPostType)
        ? signal.post_type
        : 'complaint'
    ) as SignalPostType

    // First public image evidence becomes the hero. Sign just before fetch:
    // evidence URLs are short-lived by design, so nothing persisted is used.
    let coverBase64 = ''
    const { data: evidence } = await admin
      .from('citizen_signal_evidence')
      .select('storage_path')
      .eq('signal_id', signal.id)
      .eq('visibility', 'public')
      .eq('kind', 'image')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (evidence?.storage_path) {
      try {
        const { data: signed } = await admin.storage
          .from('citizen-signals-evidence')
          .createSignedUrl(evidence.storage_path, 60)
        if (signed?.signedUrl) {
          const res = await fetch(signed.signedUrl)
          if (res.ok) {
            const buf = await res.arrayBuffer()
            const contentType = res.headers.get('content-type') || 'image/jpeg'
            coverBase64 = `data:${contentType};base64,${Buffer.from(buf).toString('base64')}`
          }
        }
      } catch {
        // silent — many signals have no usable evidence image; the branded
        // text layout below is the designed fallback.
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

    const title = signal.title
    const titleSize = title.length > 90 ? 44 : title.length > 56 ? 54 : 64
    const cosigns = Number(signal.cosign_count ?? 0)
    const supports = Number(signal.anonymous_support_count ?? 0)
    const statLine =
      locale === 'es'
        ? `${cosigns} co-firmas · ${supports} apoyos`
        : `${cosigns} co-signs · ${supports} supports`
    const stage = Number(signal.threshold_stage ?? 0)
    const stageLine =
      stage > 0 ? (locale === 'es' ? `Etapa ${stage}` : `Stage ${stage}`) : ''
    const cta =
      locale === 'es'
        ? 'Lee y co-firma en Crowd Conscious →'
        : 'Read and co-sign on Crowd Conscious →'
    const brandLine =
      locale === 'es' ? 'Señales Ciudadanas' : 'Citizen Signals'

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
          {coverBase64 ? (
            <div
              style={{
                display: 'flex',
                width: '440px',
                height: '100%',
                position: 'relative',
                background: '#1e293b',
              }}
            >
              <img
                src={coverBase64}
                width={440}
                height={630}
                alt=""
                style={{ display: 'flex', objectFit: 'cover', width: 440, height: 630 }}
              />
              <div
                style={{
                  display: 'flex',
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(90deg, rgba(15,20,25,0) 55%, rgba(15,20,25,0.85) 100%)',
                }}
              />
            </div>
          ) : null}

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
                <div style={{ display: 'flex', fontSize: 18, color: '#64748b' }}>
                  {brandLine}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div
                  style={{
                    display: 'flex',
                    padding: '6px 16px',
                    borderRadius: 999,
                    background: 'rgba(16,185,129,0.15)',
                    border: '1px solid rgba(16,185,129,0.4)',
                    color: '#10b981',
                    fontSize: 18,
                    fontWeight: 600,
                  }}
                >
                  {t.postTypeLabel(postType)} · {t.categoryLabel(category)}
                </div>
                <div
                  style={{
                    display: 'flex',
                    padding: '6px 16px',
                    borderRadius: 999,
                    background: 'rgba(148,163,184,0.1)',
                    border: `1px solid ${severityColor(severity)}`,
                    color: severityColor(severity),
                    fontSize: 18,
                    fontWeight: 600,
                  }}
                >
                  {t.severityLabel(severity)}
                </div>
                {stageLine ? (
                  <div
                    style={{
                      display: 'flex',
                      padding: '6px 16px',
                      borderRadius: 999,
                      background: 'rgba(148,163,184,0.12)',
                      border: '1px solid rgba(148,163,184,0.3)',
                      color: '#cbd5e1',
                      fontSize: 18,
                      fontWeight: 600,
                    }}
                  >
                    {stageLine}
                  </div>
                ) : null}
              </div>

              <div
                style={{
                  display: 'flex',
                  fontSize: titleSize,
                  fontWeight: 800,
                  color: '#ffffff',
                  lineHeight: 1.1,
                  letterSpacing: -1,
                  marginTop: 6,
                }}
              >
                {title.slice(0, 140)}
                {title.length > 140 ? '…' : ''}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                borderTop: '1px solid rgba(148,163,184,0.2)',
                paddingTop: 20,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', fontSize: 24, fontWeight: 700, color: '#ffffff' }}>
                  {statLine}
                </div>
                <div style={{ display: 'flex', fontSize: 16, color: '#64748b' }}>
                  crowdconscious.app
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
                {cta}
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
    console.error('[OG signal] error:', e)
    return new Response('Failed to generate image', { status: 500 })
  }
}
