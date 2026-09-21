import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth-server'
import { getMarketText } from '@/lib/i18n/market-translations'
import PulseResultClient, {
  type PulseOutcomeRow,
  type PulseViewerVote,
  type PulseVoteRow,
} from '@/components/pulse/PulseResultClient'
import type { PulseSimReveal } from '@/components/pulse/PulseSimRevealModule'
import { parseVoteMode } from '@/lib/pulse-vote-ranking'
import { DraftBanner } from '@/components/predictions/DraftBanner'
import { AdminMarketToolbar } from '@/components/predictions/AdminMarketToolbar'
import { loadMarketVoteReasoningsWithAuthors } from '@/lib/market-vote-reasonings'
import { SITE_URL } from '@/lib/seo/site'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { RunAggregates } from '@/lib/simulation/run'
import {
  computeDivergence,
  type AggregateSnapshot,
  type DivergenceResult,
} from '@/lib/simulation/divergence'
import {
  aggregatePulseVotes,
  outcomeAvgConfidence,
  type PulseVoteAggregates,
} from '@/lib/pulse-vote-aggregates'

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ token?: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  // Use the admin client so drafts are also visible at metadata time —
  // they're suppressed below via robots:noindex but we still need the row
  // to compute the cover image and title for admins/creators previewing.
  const admin = createAdminClient()
  const { data: market } = await admin
    .from('prediction_markets')
    .select(
      'title, translations, description_short, pulse_client_name, is_pulse, market_type, category, is_draft, cover_image_url'
    )
    .eq('id', id)
    .maybeSingle()

  if (market?.is_draft) {
    return {
      title: 'Borrador | Pulse Crowd Conscious',
      robots: { index: false, follow: false },
    }
  }

  const legacyPulse =
    market &&
    !market.is_pulse &&
    market.category !== 'pulse' &&
    market.market_type === 'multi' &&
    market.category === 'government'

  const showPulse =
    market &&
    (market.is_pulse || market.category === 'pulse' || legacyPulse)

  if (!showPulse) {
    return { title: 'Pulse Crowd Conscious' }
  }

  const title = getMarketText(
    {
      title: market.title,
      translations: market.translations as Parameters<typeof getMarketText>[0]['translations'],
    },
    'title',
    'es'
  )
  const client = market.pulse_client_name?.trim()
  const pageTitle = client ? `${title} · ${client}` : title

  // WhatsApp / Telegram / Twitter / iMessage all read og:image. Prefer the
  // uploaded Pulse cover (1.91:1 hero art) so the share card is the
  // curated thumbnail. Fall back to the dynamic chart card only when no
  // cover was uploaded — never to a small sponsor/client logo, since
  // WhatsApp downgrades small images to its tiny "favicon" preview style.
  const uploadedCover = market.cover_image_url?.trim() || null
  const fallbackOg = `${SITE_URL}/api/og/market/${id}`
  const ogImage = uploadedCover || fallbackOg

  // Prefer the curated short description (migration 215) for social previews —
  // it's exactly what we wrote for human readers. Fall back to the generic
  // "Resultados en vivo" line when no short description is set.
  const trShort = (market.translations as { en?: { description_short?: string } } | null)
    ?.en?.description_short
  const shortEs = market.description_short?.trim() || null
  const shortBlurb = shortEs || trShort?.trim() || `Resultados en vivo — ${title}`

  const fullTitle = `${pageTitle} | Pulse Crowd Conscious`
  return {
    title: fullTitle,
    description: shortBlurb,
    openGraph: {
      title: fullTitle,
      description: shortBlurb,
      url: `${SITE_URL}/pulse/${id}`,
      siteName: 'Crowd Conscious',
      images: [{ url: ogImage, alt: pageTitle }],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: shortBlurb,
      images: [ogImage],
    },
  }
}

export default async function PulseResultPage({ params, searchParams }: Props) {
  const { id } = await params
  const { token } = await searchParams
  const admin = createAdminClient()

  const { data: market, error } = await admin
    .from('prediction_markets')
    .select(
      `
      id,
      title,
      description,
      description_short,
      translations,
      status,
      resolution_date,
      created_at,
      published_at,
      is_pulse,
      market_type,
      category,
      created_by,
      is_draft,
      vote_mode,
      allow_other,
      pulse_client_name,
      pulse_client_logo,
      sponsor_name,
      sponsor_logo_url,
      sponsor_account_id,
      market_outcomes ( id, label, subtitle, probability, sort_order, translations, is_other ),
      market_votes ( id, confidence, outcome_id, created_at, user_id, anonymous_participant_id, reasoning, rankings, other_text )
    `
    )
    .eq('id', id)
    .maybeSingle()

  if (error || !market) {
    notFound()
  }

  const legacyPulse =
    !market.is_pulse &&
    (market as { category?: string | null }).category !== 'pulse' &&
    (market as { market_type?: string | null }).market_type === 'multi' &&
    (market as { category?: string | null }).category === 'government'

  const showPulse =
    market.is_pulse ||
    (market as { category?: string | null }).category === 'pulse' ||
    legacyPulse

  if (!showPulse) {
    redirect(`/predictions/markets/${id}`)
  }

  const cookieStore = await cookies()
  const locale = cookieStore.get('preferred-language')?.value === 'en' ? 'en' : 'es'

  const user = await getCurrentUser()
  let isAdmin = false
  if (user) {
    const ut = (user as { user_type?: string }).user_type
    const em = (user as { email?: string | null }).email?.toLowerCase().trim()
    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim()
    isAdmin = ut === 'admin' || (!!adminEmail && !!em && em === adminEmail)
  }

  // Draft access guard: only admin/creator may see draft content. Unauthenticated
  // visitors get a login redirect (so staff-shared review links work after sign-in
  // instead of a hard 404). Logged-in non-staff still get notFound() so we don't
  // confirm draft existence to arbitrary accounts. No draft HTML is rendered here.
  const isDraft = (market as { is_draft?: boolean }).is_draft === true
  const isCreator =
    !!user && (market as { created_by?: string | null }).created_by === user.id
  if (isDraft && !isAdmin && !isCreator) {
    if (!user) {
      redirect(`/login?redirect=${encodeURIComponent(`/pulse/${id}`)}`)
    }
    notFound()
  }

  let tokenValid = false
  const sponsorAccountId = (market as { sponsor_account_id?: string | null }).sponsor_account_id
  if (token && sponsorAccountId) {
    const { data: acc } = await admin
      .from('sponsor_accounts')
      .select('access_token')
      .eq('id', sponsorAccountId)
      .maybeSingle()
    tokenValid = !!(acc as { access_token?: string } | null)?.access_token && (acc as { access_token: string }).access_token === token
  }

  const isEnhancedView = isAdmin || tokenValid

  const votes = (market.market_votes ?? []) as PulseVoteRow[]
  const outcomes = (market.market_outcomes ?? []) as PulseOutcomeRow[]

  // Privacy + payload size: the public client payload carries only
  // server-side aggregates plus the viewer's own vote — never the raw
  // vote rows with every voter's user_id. Full rows go only to authorized
  // analytics viewers (admin / valid sponsor token).
  const aggregates = aggregatePulseVotes(votes)
  const viewerVoteRow = user ? votes.find((v) => v.user_id === user.id) : undefined
  const viewerVote: PulseViewerVote | null = viewerVoteRow
    ? { outcomeId: viewerVoteRow.outcome_id, confidence: viewerVoteRow.confidence }
    : null

  const featuredReasonings = await loadMarketVoteReasoningsWithAuthors(admin, id, locale)

  // ---------------------------------------------------------------------------
  // Pulse Simulation reveal gate (§5.7 / §5.2).
  //
  // THE anchoring guardrail (§1) lives HERE, in the data layer: an AI
  // prediction's direction must never reach a non-admin user before they've
  // voted, and sim numbers stay hidden from the public until the Pulse ends.
  //
  // Admin path: service-role read of `simulation_runs` (same pattern as the
  // admin Simulación APIs). Non-admins NEVER receive this payload while the
  // Pulse is open.
  //
  // Public path: EXCLUSIVELY the `revealed_simulation_runs` view (§5.2), through
  // the anon/user-context client — NEVER the raw simulation_* tables. Requires
  // SIM_REVEAL_ENABLED + revealed_at + Pulse closed/resolved.
  let simReveal: PulseSimReveal | null = null
  let simTeaser = false

  const resolutionMs = new Date(market.resolution_date as string).getTime()
  const isPastCloseDate = Number.isFinite(resolutionMs) && resolutionMs <= Date.now()
  const isClosedOrResolved =
    market.status === 'resolved' || market.status === 'closed' || isPastCloseDate

  if (isAdmin) {
    try {
      const { data: adminRow } = await admin
        .from('simulation_runs')
        .select('id, aggregates, divergence, revealed_at, status')
        .eq('market_id', id)
        .eq('status', 'complete')
        .eq('is_brand_pretest', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (adminRow) {
        const runAggregates = adminRow.aggregates as unknown as RunAggregates | null
        if (runAggregates) {
          simReveal = buildAdminSimReveal({
            aggregates: runAggregates,
            votes,
            outcomes,
            pulseOpen: !isClosedOrResolved,
            unpublished: !adminRow.revealed_at,
          })
        }
      }
    } catch {
      simReveal = null
    }
  } else if (process.env.SIM_REVEAL_ENABLED === 'true') {
    const authedHasVoted = !!viewerVote

    try {
      const supabasePublic =
        (await createClient()) as unknown as SupabaseClient<Database>

      const { data: revealedRow } = await supabasePublic
        .from('revealed_simulation_runs')
        .select('id, market_id, aggregates, divergence, revealed_at')
        .eq('market_id', id)
        .order('revealed_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const run = revealedRow
        ? {
            ...revealedRow,
            aggregates: revealedRow.aggregates as unknown as RunAggregates | null,
            divergence: revealedRow.divergence as unknown as DivergenceResult | null,
          }
        : null

      if (run) {
        const fullReveal = isClosedOrResolved && (authedHasVoted || isClosedOrResolved)

        if (fullReveal && run.divergence) {
          simReveal = {
            divergenceIndex: run.divergence.id,
            perOption: (run.divergence.per_option ?? []).map((po) => ({
              option: po.option,
              real_share: po.real_share,
              sim_share: po.sim_share,
            })),
            cita: run.aggregates?.synthesis?.cita_sim_representativa ?? null,
          }
        } else if (!isClosedOrResolved && !authedHasVoted) {
          simTeaser = true
        }
      }
    } catch {
      simReveal = null
      simTeaser = false
    }
  }

  return (
    <>
      {isDraft && <DraftBanner marketId={market.id} />}
      {isAdmin && <AdminMarketToolbar marketId={market.id} isPulse locale={locale} />}
      <PulseResultClient
        marketId={market.id}
        title={market.title}
        description={market.description}
        descriptionShort={
          (market as { description_short?: string | null }).description_short ?? null
        }
        translations={market.translations}
        status={market.status}
        resolutionDate={market.resolution_date}
        openedAt={
          (market as { published_at?: string | null }).published_at ??
          (market as { created_at?: string }).created_at ??
          null
        }
        pulseClientName={market.pulse_client_name}
        pulseClientLogo={market.pulse_client_logo}
        sponsorName={market.sponsor_name}
        sponsorLogoUrl={market.sponsor_logo_url}
        outcomes={outcomes}
        voteMode={parseVoteMode((market as { vote_mode?: string }).vote_mode)}
        allowOther={(market as { allow_other?: boolean }).allow_other === true}
        aggregates={aggregates}
        viewerVote={viewerVote}
        enhancedVotes={isEnhancedView ? votes : undefined}
        locale={locale}
        isEnhancedView={isEnhancedView}
        featuredReasonings={featuredReasonings}
        simReveal={simReveal}
        simTeaser={simTeaser}
      />
    </>
  )
}

/**
 * Admin-only live comparison. Built on the server from the latest complete
 * sim run + the current real vote mix. Never attached to non-admin payloads.
 */
function buildAdminSimReveal(args: {
  aggregates: RunAggregates
  votes: PulseVoteRow[]
  outcomes: PulseOutcomeRow[]
  pulseOpen: boolean
  unpublished: boolean
}): PulseSimReveal {
  const simSnapshot = sharesFromRunAggregates(args.aggregates)
  const realSnapshot = labeledRealSnapshot(args.votes, args.outcomes)
  const hasReal = Object.values(realSnapshot.option_shares).some(
    (n) => typeof n === 'number' && Number.isFinite(n) && n > 0,
  )

  let divergenceIndex: number | null = null
  let perOption: PulseSimReveal['perOption']

  if (hasReal) {
    const live = computeDivergence(realSnapshot, simSnapshot)
    divergenceIndex = live.id
    perOption = live.per_option.map((po) => ({
      option: po.option,
      real_share: po.real_share,
      sim_share: po.sim_share,
    }))
  } else {
    perOption = Object.entries(simSnapshot.option_shares).map(([option, simShare]) => ({
      option,
      real_share: 0,
      sim_share: simShare,
    }))
  }

  return {
    divergenceIndex,
    perOption,
    cita: args.aggregates.synthesis?.cita_sim_representativa ?? null,
    adminPreview: args.pulseOpen || args.unpublished,
    pulseOpen: args.pulseOpen,
    unpublished: args.unpublished,
  }
}

function sharesFromRunAggregates(agg: RunAggregates): AggregateSnapshot {
  const weighted = agg.confidence_weighted_shares ?? {}
  const weightedTotal = Object.values(weighted).reduce(
    (sum, n) => sum + (typeof n === 'number' && Number.isFinite(n) ? n : 0),
    0,
  )
  return {
    option_shares: weightedTotal > 0 ? weighted : (agg.option_shares ?? {}),
    avg_confidence_by_option: agg.avg_confidence_by_option ?? {},
  }
}

function labeledRealSnapshot(
  votes: PulseVoteRow[],
  outcomes: PulseOutcomeRow[],
): AggregateSnapshot {
  const labelById = new Map(outcomes.map((o) => [o.id, o.label]))
  const labeled = votes.map((v) => ({
    outcome_id: labelById.get(v.outcome_id) ?? v.outcome_id,
    confidence: v.confidence,
    created_at: v.created_at,
  }))
  const agg: PulseVoteAggregates = aggregatePulseVotes(labeled)
  const option_shares: Record<string, number> = {}
  const avg_confidence_by_option: Record<string, number> = {}
  let totalConfidence = 0
  for (const stats of Object.values(agg.byOutcome)) {
    totalConfidence += stats.confidenceSum
  }
  for (const [option, stats] of Object.entries(agg.byOutcome)) {
    const countShare = agg.totalVotes > 0 ? stats.count / agg.totalVotes : 0
    const weighted = totalConfidence > 0 ? stats.confidenceSum / totalConfidence : 0
    option_shares[option] = totalConfidence > 0 ? weighted : countShare
    const avg = outcomeAvgConfidence(stats)
    if (avg !== null) avg_confidence_by_option[option] = avg
  }
  return { option_shares, avg_confidence_by_option }
}
