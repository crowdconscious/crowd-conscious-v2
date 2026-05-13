import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import dynamic from 'next/dynamic'
import { getCurrentUser } from '@/lib/auth-server'
import { createSignalsAdminClient } from '@/lib/signals/supabase'
import {
  getCitizenSignalsCopy,
  type CitizenSignalsLocale,
} from '@/lib/i18n/citizen-signals'
import SignalDetail from '@/components/signals/SignalDetail'

const Footer = dynamic(() => import('@/components/Footer'))

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
  return {
    title: `${row.title} | ${locale === 'es' ? 'Señales Ciudadanas' : 'Citizen Signals'}`,
    description,
    openGraph: {
      title: row.title,
      description,
      type: 'article',
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
      'id, public_slug, post_type, category, severity, target_kind, citizen_target_id, title, body, language, conscious_location_id, display_name, anonymous_display_mode, threshold_stage, cosign_count, stage1_met_at, stage2_met_at, created_at, updated_at'
    )
    .eq('public_slug', slug)
    .maybeSingle()

  if (!signal) notFound()

  // Hydrate target + location + evidence (public-only) + responses.
  const [{ data: target }, { data: location }, { data: evidence }, { data: responses }] = await Promise.all([
    admin
      .from('citizen_targets')
      .select('id, slug, display_name, target_kind')
      .eq('id', signal.citizen_target_id)
      .maybeSingle(),
    admin
      .from('conscious_locations')
      .select('id, slug, name, neighborhood, city, latitude, longitude')
      .eq('id', signal.conscious_location_id)
      .maybeSingle(),
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

  return (
    <div className="min-h-screen bg-[#0f1419] text-slate-100">
      <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <SignalDetail
          locale={locale}
          signal={signal}
          target={target ?? null}
          location={location ?? null}
          evidence={evidenceWithUrls}
          responses={responses ?? []}
          viewerSignedIn={!!user}
          viewerHasCosigned={viewerHasCosigned}
        />
        <p className="mt-10 text-center text-xs text-slate-500">
          {t.legal.noLegalAdviceBody}
        </p>
      </main>
      <Footer />
    </div>
  )
}
