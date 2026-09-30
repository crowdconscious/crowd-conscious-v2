import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getCurrentUser } from '@/lib/auth-server'
import { isAdminUser } from '@/lib/auth/is-admin'
import type { PulseListingLocale } from '@/lib/i18n/pulse-listing'
import { decideReplayAccess } from '@/lib/sim-viewer/access'
import { isSimViewerEnabled } from '@/lib/sim-viewer-flag'
import { isSimViewerPublicClosedEnabled } from '@/lib/sim-viewer/public-closed-flag'
import {
  buildSimulationViewerHref,
  pickDefaultSimulationRun,
} from '@/lib/sim-viewer/pick-default-run'
import {
  canDownloadFullReport,
  isReportEligible,
} from '@/lib/sim-report/access'
import { isSimReportEnabled } from '@/lib/sim-report/flag'

export type PulseListingMarketRow = {
  id: string
  title: string
  translations: unknown
  pulse_client_name: string | null
  pulse_client_logo: string | null
  cover_image_url: string | null
  sponsor_logo_url: string | null
  status: string
  total_votes: number | null
  resolution_date: string | null
  created_at: string
  market_type: string | null
  category: string | null
  is_pulse: boolean | null
  /** /pulse/results only — viewable sim replay when access allows. */
  simulationViewerHref?: string | null
  simulationRunId?: string | null
  /** /pulse/results only — SIM_REPORT_ENABLED + report eligibility. */
  reportEligible?: boolean
  reportCanFull?: boolean
}

const PULSE_SELECT =
  'id, title, translations, pulse_client_name, pulse_client_logo, cover_image_url, sponsor_logo_url, status, total_votes, resolution_date, created_at, market_type, category, is_pulse'

/** Conscious Pulse listing only: explicit flag or pulse category (not legacy government multis). */
const PULSE_OR = 'is_pulse.eq.true,category.eq.pulse'

export async function getPulseListingLocale(): Promise<PulseListingLocale> {
  const cookieStore = await cookies()
  return cookieStore.get('preferred-language')?.value === 'en' ? 'en' : 'es'
}

export type PulseListingContext = {
  locale: PulseListingLocale
  isAdmin: boolean
  sponsorAccount: { id: string; company_name: string } | null
  userEmail: string | null
}

export async function getPulseListingContext(): Promise<PulseListingContext> {
  const locale = await getPulseListingLocale()
  const user = await getCurrentUser()
  if (!user) {
    return { locale, isAdmin: false, sponsorAccount: null, userEmail: null }
  }

  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: prof } = await supabase
    .from('profiles')
    .select('user_type, email')
    .eq('id', user.id)
    .single()

  const isAdmin = isAdminUser(prof)
  const userEmail = (prof?.email ?? user.email ?? null)?.trim() || null

  let sponsorAccount: { id: string; company_name: string } | null = null
  if (!isAdmin && userEmail) {
    const { data: sa } = await admin
      .from('sponsor_accounts')
      .select('id, company_name')
      .eq('is_pulse_client', true)
      .ilike('contact_email', userEmail)
      .maybeSingle()
    if (sa) sponsorAccount = { id: sa.id, company_name: sa.company_name }
  }

  return { locale, isAdmin, sponsorAccount, userEmail }
}

export async function fetchPulseMarketsForListing(ctx: PulseListingContext): Promise<PulseListingMarketRow[]> {
  const publicClient = await createClient()
  const admin = createAdminClient()

  if (ctx.isAdmin) {
    const { data: rows } = await admin
      .from('prediction_markets')
      .select(PULSE_SELECT)
      .is('archived_at', null)
      .or(PULSE_OR)
      .order('created_at', { ascending: false })
    return (rows ?? []) as PulseListingMarketRow[]
  }

  if (ctx.sponsorAccount) {
    const { data: rows } = await admin
      .from('prediction_markets')
      .select(PULSE_SELECT)
      .is('archived_at', null)
      .eq('sponsor_account_id', ctx.sponsorAccount.id)
      .or(PULSE_OR)
      .order('created_at', { ascending: false })
    return (rows ?? []) as PulseListingMarketRow[]
  }

  const { data: rows } = await publicClient
    .from('prediction_markets')
    .select(PULSE_SELECT)
    .is('archived_at', null)
    .in('status', ['active', 'trading'])
    .eq('is_draft', false)
    .or(PULSE_OR)
    .order('created_at', { ascending: false })

  return (rows ?? []) as PulseListingMarketRow[]
}

type SimRunRow = {
  id: string
  market_id: string
  revealed_at: string | null
  is_fixture: boolean | null
  status: string
  created_at: string
  divergence_index: number | null
  divergence_meta: unknown
  divergence: unknown
  is_brand_pretest: boolean | null
}

/**
 * Attach simulation replay + report entry metadata for resolved listing cards.
 * Reuses decideReplayAccess / isReportEligible so public surfaces match the
 * Visor and report API. Skips work when both feature flags are off.
 */
async function attachClosedPulseSimAccess(
  markets: PulseListingMarketRow[],
  ctx: Pick<PulseListingContext, 'isAdmin' | 'sponsorAccount' | 'userEmail'>,
): Promise<PulseListingMarketRow[]> {
  if (markets.length === 0) return markets

  const viewerOn = isSimViewerEnabled()
  const reportOn = isSimReportEnabled()
  if (!viewerOn && !reportOn) return markets

  const admin = createAdminClient()
  const ids = markets.map((m) => m.id)
  const [{ data: runs }, { data: revealed }] = await Promise.all([
    admin
      .from('simulation_runs')
      .select(
        'id, market_id, revealed_at, is_fixture, status, created_at, divergence_index, divergence_meta, divergence, is_brand_pretest',
      )
      .in('market_id', ids)
      .eq('status', 'complete')
      .or('is_brand_pretest.eq.false,is_brand_pretest.is.null')
      .order('created_at', { ascending: false })
      .limit(Math.min(500, ids.length * 10)),
    // Public revealed view — same contract as /pulse/[id] sim reveal. Lets
    // entry points resolve when simulation_runs is RLS-blocked for the caller.
    admin
      .from('revealed_simulation_runs')
      .select('id, market_id, revealed_at, divergence')
      .in('market_id', ids)
      .order('revealed_at', { ascending: false })
      .limit(Math.min(200, ids.length * 3)),
  ])

  const byMarket = new Map<string, SimRunRow[]>()
  for (const run of (runs ?? []) as SimRunRow[]) {
    const list = byMarket.get(run.market_id) ?? []
    list.push(run)
    byMarket.set(run.market_id, list)
  }
  for (const row of revealed ?? []) {
    const marketId = row.market_id as string
    const existing = byMarket.get(marketId) ?? []
    if (existing.some((r) => r.id === row.id)) continue
    const div = row.divergence as { id?: number } | null
    existing.push({
      id: row.id as string,
      market_id: marketId,
      revealed_at: (row.revealed_at as string | null) ?? null,
      is_fixture: false,
      status: 'complete',
      created_at: (row.revealed_at as string) ?? new Date(0).toISOString(),
      divergence_index:
        typeof div?.id === 'number' && Number.isFinite(div.id) ? div.id : null,
      divergence_meta: null,
      divergence: row.divergence,
      is_brand_pretest: false,
    })
    byMarket.set(marketId, existing)
  }

  const publicClosedEnabled = isSimViewerPublicClosedEnabled()
  const reportCanFull = canDownloadFullReport({
    isAdmin: ctx.isAdmin,
    isPulseClient: !!ctx.sponsorAccount,
    userEmail: ctx.userEmail,
  })

  return markets.map((m) => {
    const candidates = byMarket.get(m.id) ?? []
    const viewerRun = pickDefaultSimulationRun(candidates)
    if (!viewerRun) {
      return {
        ...m,
        simulationViewerHref: null,
        simulationRunId: null,
        reportEligible: false,
        reportCanFull: false,
      }
    }

    let simulationViewerHref: string | null = null
    if (viewerOn) {
      const decision = decideReplayAccess({
        isAdmin: ctx.isAdmin,
        includeRealParam: false,
        pulseStatus: m.status,
        runRevealedAt: viewerRun.revealed_at,
        runIsFixture: viewerRun.is_fixture === true,
        publicClosedEnabled,
      })
      if (decision.allow) {
        simulationViewerHref = buildSimulationViewerHref(m.id, viewerRun.id)
      }
    }

    const reportEligible =
      reportOn &&
      isReportEligible({
        pulseStatus: m.status,
        runRevealedAt: viewerRun.revealed_at,
        runIsFixture: viewerRun.is_fixture === true,
        isAdmin: ctx.isAdmin,
      })

    return {
      ...m,
      simulationViewerHref,
      simulationRunId: viewerRun.id,
      reportEligible,
      reportCanFull: reportEligible ? reportCanFull : false,
    }
  })
}

/**
 * Resolved Pulses for the public /pulse/results page.
 *
 * Uses the admin client so the archive stays browsable regardless of RLS on
 * resolved rows; the read is tightly scoped to resolved, published Pulses and
 * only returns the same non-sensitive listing columns as the active listing.
 *
 * Deliberately does NOT filter on `archived_at`: the daily archive cron stamps
 * `archived_at` on resolved markets after 7 days, so filtering it out would make
 * the results page empty over time. We want results to remain a permanent public
 * record, so we ignore the archive flag here (the active listing still hides them).
 */
export async function fetchResolvedPulseMarketsForListing(
  ctx: Pick<PulseListingContext, 'isAdmin' | 'sponsorAccount' | 'userEmail'> = {
    isAdmin: false,
    sponsorAccount: null,
    userEmail: null,
  },
): Promise<PulseListingMarketRow[]> {
  const admin = createAdminClient()
  const { data: rows } = await admin
    .from('prediction_markets')
    .select(PULSE_SELECT)
    .eq('status', 'resolved')
    .eq('is_draft', false)
    .or(PULSE_OR)
    .order('resolved_at', { ascending: false, nullsFirst: false })

  const markets = (rows ?? []) as PulseListingMarketRow[]
  return attachClosedPulseSimAccess(markets, ctx)
}
