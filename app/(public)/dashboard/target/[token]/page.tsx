import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import nextDynamic from 'next/dynamic'
import { createSignalsAdminClient } from '@/lib/signals/supabase'
import { hashTargetToken, safeHashEquals } from '@/lib/target-token-hash'
import {
  getCitizenSignalsCopy,
  type CitizenSignalsLocale,
} from '@/lib/i18n/citizen-signals'
import TargetDashboardClient, {
  type TargetDashboardSignal,
} from '@/components/target/TargetDashboardClient'

const Footer = nextDynamic(() => import('@/components/Footer'))

export const dynamic = 'force-dynamic'
export const revalidate = 0

function readLocale(c: {
  get: (k: string) => { value?: string } | undefined
}): CitizenSignalsLocale {
  return c.get('preferred-language')?.value === 'en' ? 'en' : 'es'
}

type PageProps = {
  params: Promise<{ token: string }>
}

/**
 * /dashboard/target/[token] — magic-link dashboard for target reps.
 *
 * The raw token from the URL is SHA-256 hashed and compared against
 * citizen_target_access_tokens.token_hash with a timing-safe compare. Each
 * page render loads the published signals targeting this rep's
 * citizen_target_id; the client component handles posting responses.
 */
export default async function TargetDashboard({ params }: PageProps) {
  if (process.env.SIGNALS_ENABLED !== 'true') notFound()

  const { token } = await params
  const cookieStore = await cookies()
  const locale = readLocale(cookieStore)
  const t = getCitizenSignalsCopy(locale)

  if (!token || token.length > 256) {
    return <InvalidLinkPage locale={locale} reason="invalid" />
  }

  const admin = createSignalsAdminClient()
  const candidateHash = hashTargetToken(token)

  const { data: tokenRow } = await admin
    .from('citizen_target_access_tokens')
    .select('id, citizen_target_id, token_hash, expires_at, revoked_at')
    .eq('token_hash', candidateHash)
    .maybeSingle()

  if (!tokenRow || !safeHashEquals(tokenRow.token_hash, candidateHash)) {
    return <InvalidLinkPage locale={locale} reason="invalid" />
  }
  if (tokenRow.revoked_at) {
    return <InvalidLinkPage locale={locale} reason="revoked" />
  }
  if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
    return <InvalidLinkPage locale={locale} reason="expired" />
  }

  const { data: target } = await admin
    .from('citizen_targets')
    .select('id, slug, display_name, target_kind')
    .eq('id', tokenRow.citizen_target_id)
    .maybeSingle()

  if (!target) {
    return <InvalidLinkPage locale={locale} reason="invalid" />
  }

  // Pull all published signals for this target. We include stage 0
  // because targets sometimes want to acknowledge early — but the cron
  // only emails them at stage 1.
  const { data: signals } = await admin
    .from('citizen_signals')
    .select(
      'id, public_slug, post_type, category, severity, title, body, language, anonymous_display_mode, anonymous_display_name, threshold_stage, cosign_count, stage1_met_at, stage2_met_at, created_at'
    )
    .eq('citizen_target_id', target.id)
    .eq('publication_status', 'published')
    .order('threshold_stage', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(200)

  type LatestResponseRow = {
    signal_id: string
    body: string
    official_status: string
    created_at: string
  }

  const signalIds = (signals ?? []).map((s) => s.id)
  let responses: LatestResponseRow[] = []
  if (signalIds.length > 0) {
    const { data } = await admin
      .from('citizen_signal_responses')
      .select('signal_id, body, official_status, created_at')
      .in('signal_id', signalIds)
      .order('created_at', { ascending: false })
    responses = (data ?? []) as LatestResponseRow[]
  }

  const latestResponseBySignal = new Map<string, LatestResponseRow>()
  for (const r of responses) {
    if (!latestResponseBySignal.has(r.signal_id)) {
      latestResponseBySignal.set(r.signal_id, r)
    }
  }

  const dashboardSignals: TargetDashboardSignal[] = (signals ?? []).map(
    (s) => ({
      id: s.id,
      public_slug: s.public_slug,
      post_type: s.post_type,
      category: s.category,
      severity: s.severity,
      title: s.title,
      body: s.body,
      language: s.language,
      cosign_count: s.cosign_count,
      threshold_stage: s.threshold_stage,
      stage1_met_at: s.stage1_met_at,
      stage2_met_at: s.stage2_met_at,
      created_at: s.created_at,
      latest_response: latestResponseBySignal.get(s.id) ?? null,
    })
  )

  return (
    <div className="min-h-screen bg-[#0f1419] text-slate-100">
      <main className="mx-auto max-w-3xl px-4 py-12">
        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400/90">
            {t.targetDash.title}
          </p>
          <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
            {target.display_name}
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            {t.targetDash.heroBody}
          </p>
        </header>

        <TargetDashboardClient
          locale={locale}
          rawToken={token}
          targetName={target.display_name}
          signals={dashboardSignals}
        />
      </main>
      <Footer />
    </div>
  )
}

function InvalidLinkPage({
  locale,
  reason,
}: {
  locale: CitizenSignalsLocale
  reason: 'invalid' | 'expired' | 'revoked'
}) {
  const t = getCitizenSignalsCopy(locale)
  const msg =
    reason === 'expired' ? t.targetDash.expiredToken : t.targetDash.invalidToken
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f1419] px-4 text-center text-slate-300">
      <div>
        <p className="text-lg font-semibold text-white">
          {t.targetDash.title}
        </p>
        <p className="mt-3 max-w-md text-sm text-slate-400">{msg}</p>
      </div>
    </div>
  )
}
