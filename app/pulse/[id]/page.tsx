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
import { aggregatePulseVotes } from '@/lib/pulse-vote-aggregates'
import { DraftBanner } from '@/components/predictions/DraftBanner'
import { AdminMarketToolbar } from '@/components/predictions/AdminMarketToolbar'
import { loadMarketVoteReasoningsWithAuthors } from '@/lib/market-vote-reasonings'
import { SITE_URL } from '@/lib/seo/site'
import type { RunAggregates } from '@/lib/simulation/run'
import type { DivergenceResult } from '@/lib/simulation/divergence'

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
      is_pulse,
      market_type,
      category,
      created_by,
      is_draft,
      pulse_client_name,
      pulse_client_logo,
      sponsor_name,
      sponsor_logo_url,
      sponsor_account_id,
      market_outcomes ( id, label, subtitle, probability, sort_order, translations ),
      market_votes ( id, confidence, outcome_id, created_at, user_id, anonymous_participant_id, reasoning )
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

  // Draft access guard: hide the existence of a draft from anyone other than
  // an admin or the market's creator. Returning notFound() (instead of a
  // distinct 403) avoids leaking the fact that a draft URL exists.
  const isDraft = (market as { is_draft?: boolean }).is_draft === true
  const isCreator =
    !!user && (market as { created_by?: string | null }).created_by === user.id
  if (isDraft && !isAdmin && !isCreator) {
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
  // Pulse Simulation reveal gate (§5.7 / §5.2) — behind SIM_REVEAL_ENABLED.
  //
  // THE anchoring guardrail (§1) lives HERE, in the data layer: an AI
  // prediction's direction must never reach a user before they've voted. The
  // gate is computed server-side and sim aggregates are serialized into the
  // client payload ONLY inside the full-reveal branch below. Pre-reveal, the
  // client receives at most a content-free `simTeaser` boolean — zero numbers,
  // option names, shares, confidence, or anything directional.
  //
  // Read path: EXCLUSIVELY the `revealed_simulation_runs` view (§5.2), through
  // the anon/user-context client (RLS/grant-respecting) — NEVER the raw
  // simulation_* tables. The view only returns runs whose `revealed_at` is set,
  // so a returned row already means "revealed".
  //
  // SIM_REVEAL_ENABLED is a SERVER env var so the gate can run here; unset or
  // anything but the string 'true' is OFF (feature invisible, not an error).
  //
  // TODO(A5): the September Pulse-close push carries this reveal on the A5
  // `reveal` payload field — not built here.
  let simReveal: PulseSimReveal | null = null
  let simTeaser = false

  if (process.env.SIM_REVEAL_ENABLED === 'true') {
    const resolutionMs = new Date(market.resolution_date as string).getTime()
    const isPastCloseDate = Number.isFinite(resolutionMs) && resolutionMs <= Date.now()
    const isClosedOrResolved =
      market.status === 'resolved' || market.status === 'closed' || isPastCloseDate
    const authedHasVoted = !!viewerVote

    try {
      // Anon/user-context client: the read is gated by the DB grant on the view
      // (§5.2) exactly as any client would be — never the service-role path.
      const supabasePublic = await createClient()

      // TODO(once migrations 252-254 applied + types/database.ts regenerated):
      // drop this local interface and the `as unknown as` cast in favor of the
      // generated Database types (mirrors lib/simulation/run.ts + the admin sim
      // routes) to keep `tsc --noEmit` clean.
      interface RevealedSimulationRunRow {
        id: string
        market_id: string | null
        aggregates: RunAggregates | null
        divergence: DivergenceResult | null
        revealed_at: string | null
      }

      const { data: revealedRow } = await supabasePublic
        .from('revealed_simulation_runs')
        .select('id, market_id, aggregates, divergence, revealed_at')
        .eq('market_id', id)
        .order('revealed_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const run = (revealedRow ?? null) as unknown as RevealedSimulationRunRow | null

      // A row from the view is, by construction, a revealed run (revealed_at set).
      if (run) {
        // Full reveal requires ALL of: flag on (checked above) + revealed run +
        // Pulse closed/resolved + (user voted OR Pulse closed). Since the last
        // clause is satisfied whenever the Pulse is closed, this reduces to
        // "revealed run + closed" — but we keep the condition explicit to mirror
        // the §5.7 spec exactly.
        const fullReveal = isClosedOrResolved && (authedHasVoted || isClosedOrResolved)

        if (fullReveal && run.divergence) {
          // ONLY the minimal comparison crosses to the client: the index,
          // per-option real vs sim shares, and one representative quote. No raw
          // votes, no reasonings, no confidence maps — nothing else is attached.
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
          // Pre-vote, Pulse still open: content-free teaser ONLY. Not a single
          // sim number reaches the client on this path.
          simTeaser = true
        }
      }
    } catch {
      // The view may not exist yet in every environment (migrations 252-254).
      // Never let the sim gate break the load-bearing consumer Pulse page
      // (CLAUDE.md "Things to never break") — fall back to attaching nothing.
      simReveal = null
      simTeaser = false
    }
  }

  return (
    <>
      {isDraft && <DraftBanner marketId={market.id} />}
      {isAdmin && <AdminMarketToolbar marketId={market.id} isPulse />}
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
        pulseClientName={market.pulse_client_name}
        pulseClientLogo={market.pulse_client_logo}
        sponsorName={market.sponsor_name}
        sponsorLogoUrl={market.sponsor_logo_url}
        outcomes={outcomes}
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
