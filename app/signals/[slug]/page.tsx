import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'
import { createSignalsAdminClient } from '@/lib/signals/supabase'
import { createAdminClient } from '@/lib/supabase-admin'
import {
  getCitizenSignalsCopy,
  type CitizenSignalsLocale,
} from '@/lib/i18n/citizen-signals'
import SignalDetail from '@/components/signals/SignalDetail'
import type { SignalSponsorInfo } from '@/components/signals/SponsorBadge'
import { SITE_URL } from '@/lib/seo/site'

function readLocale(c: {
  get: (k: string) => { value?: string } | undefined
}): CitizenSignalsLocale {
  return c.get('preferred-language')?.value === 'en' ? 'en' : 'es'
}

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  if (process.env.SIGNALS_ENABLED !== 'true') return {}
  const { slug } = await params
  const admin = createSignalsAdminClient()
  const { data: row } = await admin
    .from('citizen_signals_public')
    .select('title, body, post_type, category')
    .eq('public_slug', slug)
    .maybeSingle()
  if (!row) return {}
  const cookieStore = await cookies()
  const locale = readLocale(cookieStore)
  const description =
    row.body.length > 160 ? `${row.body.slice(0, 157).trim()}…` : row.body
  // Composed 1200x630 card with the first evidence image as hero (or the
  // branded text layout when none). Absolute URL so scrapers don't depend
  // on metadataBase.
  const ogImage = `${SITE_URL}/api/og/signal/${encodeURIComponent(slug)}${locale === 'en' ? '?lang=en' : ''}`
  return {
    title: `${row.title} | ${locale === 'es' ? 'Señales Ciudadanas' : 'Citizen Signals'}`,
    description,
    openGraph: {
      title: row.title,
      description,
      type: 'article',
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: row.title,
      description,
      images: [ogImage],
    },
  }
}

export default async function SignalsDetailPage({ params }: PageProps) {
  if (process.env.SIGNALS_ENABLED !== 'true') notFound()

  const { slug } = await params
  const cookieStore = await cookies()
  const locale = readLocale(cookieStore)
  const t = getCitizenSignalsCopy(locale)

  const admin = createSignalsAdminClient()

  const { data: signal } = await admin
    .from('citizen_signals_public')
    .select(
      'id, public_slug, post_type, category, severity, target_kind, citizen_target_id, title, body, language, conscious_location_id, partner_location_id, street_reference, display_name, anonymous_display_mode, threshold_stage, cosign_count, anonymous_support_count, stage1_met_at, stage2_met_at, created_at, updated_at'
    )
    .eq('public_slug', slug)
    .maybeSingle()

  if (!signal) notFound()

  // Hydrate target + alcaldía + partner location (if any) + evidence
  // (public-only) + responses.
  const [
    { data: target },
    { data: location },
    { data: partnerLocation },
    { data: evidence },
    { data: responses },
  ] = await Promise.all([
    signal.citizen_target_id
      ? admin
          .from('citizen_targets')
          .select('id, slug, display_name, target_kind')
          .eq('id', signal.citizen_target_id)
          .maybeSingle()
      : Promise.resolve({ data: null } as const),
    signal.conscious_location_id
      ? admin
          .from('conscious_locations')
          .select('id, slug, name, neighborhood, city, latitude, longitude')
          .eq('id', signal.conscious_location_id)
          .maybeSingle()
      : Promise.resolve({ data: null } as const),
    signal.partner_location_id
      ? admin
          .from('conscious_locations')
          .select('id, slug, name, neighborhood, city')
          .eq('id', signal.partner_location_id)
          .maybeSingle()
      : Promise.resolve({ data: null } as const),
    admin
      .from('citizen_signal_evidence')
      .select('id, kind, storage_path, external_url, caption, created_at')
      .eq('signal_id', signal.id)
      .eq('visibility', 'public')
      .order('created_at', { ascending: true }),
    admin
      .from('citizen_signal_responses')
      .select('id, author_label, body, official_status, created_at')
      .eq('signal_id', signal.id)
      .order('created_at', { ascending: true }),
  ])

  // Resolve signed URLs for image/pdf evidence so the client can render
  // them without making per-row round-trips. URLs are signed for 60 min.
  const evidenceWithUrls = await Promise.all(
    (evidence ?? []).map(async (ev) => {
      if (ev.kind === 'link' || !ev.storage_path) {
        return {
          id: ev.id,
          kind: ev.kind,
          caption: ev.caption,
          url: ev.external_url ?? null,
          created_at: ev.created_at,
        }
      }
      const { data: signed } = await admin.storage
        .from('citizen-signals-evidence')
        .createSignedUrl(ev.storage_path, 60 * 60)
      return {
        id: ev.id,
        kind: ev.kind,
        caption: ev.caption,
        url: signed?.signedUrl ?? null,
        created_at: ev.created_at,
      }
    })
  )

  // Resolve the viewer's cosign state so the button can render the
  // correct verb on first paint. Anonymous viewers always get the
  // "co-sign" prompt; signed-in viewers get accurate state.
  // Resolve the active sponsorship (display-only) for the "Patrocinado" badge.
  // Uses the untyped admin client because the creator-market tables are not
  // modelled in types/database.ts. READ-ONLY: this never writes the signal.
  const sponsor = await resolveSignalSponsor(signal.id)

  const user = await getCurrentUser()
  let viewerHasCosigned = false
  if (user) {
    const { data: cosignRow } = await admin
      .from('citizen_signal_cosigns')
      .select('id')
      .eq('signal_id', signal.id)
      .eq('user_id', user.id)
      .maybeSingle()
    viewerHasCosigned = !!cosignRow
  }

  // The surrounding `app/signals/layout.tsx` already provides the dark
  // chrome (LandingNav + Footer + `data-theme="dark"`), so this page
  // only owns the inner reading column. Width opens up at `lg` so the
  // detail's two-column grid (narrative + 320px aside) fits without
  // crowding either column.
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14 lg:max-w-5xl">
      <SignalDetail
        locale={locale}
        signal={signal}
        target={target ?? null}
        location={location ?? null}
        partnerLocation={partnerLocation ?? null}
        evidence={evidenceWithUrls}
        responses={responses ?? []}
        viewerSignedIn={!!user}
        viewerHasCosigned={viewerHasCosigned}
        sponsor={sponsor}
      />
      <p className="mt-10 text-center text-xs text-slate-500">
        {t.legal.noLegalAdviceBody}
      </p>
    </main>
  )
}

/**
 * Resolve the active sponsorship for a signal (display-only). Returns null when
 * the signal is not sponsored. Two cheap reads against the un-modelled creator-
 * market tables via the untyped admin client.
 */
async function resolveSignalSponsor(
  signalId: string
): Promise<SignalSponsorInfo | null> {
  const admin = createAdminClient()

  const { data: joins } = await admin
    .from('signal_sponsorships')
    .select('sponsorship_id, fund_pillar, badge_message')
    .eq('signal_id', signalId)
    .order('created_at', { ascending: false })

  const rows = (joins ?? []) as Array<{
    sponsorship_id: string
    fund_pillar: string
    badge_message: string
  }>
  if (rows.length === 0) return null

  const ids = rows.map((r) => r.sponsorship_id)
  const { data: sponsorships } = await admin
    .from('creator_sponsorships')
    .select('id, sponsor_name, sponsor_logo_url, status')
    .in('id', ids)
    .eq('status', 'active')

  const active = (sponsorships ?? []) as Array<{
    id: string
    sponsor_name: string
    sponsor_logo_url: string | null
    status: string
  }>
  if (active.length === 0) return null

  // Prefer the most recent join whose sponsorship is still active.
  const join = rows.find((r) => active.some((s) => s.id === r.sponsorship_id))
  if (!join) return null
  const sponsorship = active.find((s) => s.id === join.sponsorship_id)
  if (!sponsorship) return null

  return {
    sponsorName: sponsorship.sponsor_name,
    sponsorLogoUrl: sponsorship.sponsor_logo_url,
    fundPillar: join.fund_pillar,
    badgeMessage: join.badge_message,
  }
}
