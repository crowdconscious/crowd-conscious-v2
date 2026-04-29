import type { Metadata } from 'next'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { SITE_URL } from '@/lib/seo/site'
import { createClient } from '@/lib/supabase-server'
import { fetchConsciousFundBalanceMxn } from '@/lib/conscious-fund-balance'
import type { Json } from '@/types/database'
import dynamic from 'next/dynamic'
import { ChevronRight } from 'lucide-react'
import LandingNav from './components/landing/LandingNav'
import { LiveEventBanner } from './components/landing/LiveEventBanner'
import LandingLocationsSection from './components/landing/LandingLocationsSection'
import { LandingHeroBlock } from './components/landing/LandingHeroBlock'
import { BrandsMiniPitch } from './components/landing/BrandsMiniPitch'
import type { LocationCardRow } from '@/components/locations/LocationCard'
import type { MarketCardMarket, MarketCardOutcome } from '@/components/MarketCard'
import { PUBLIC_MARKET_MIN_VOTES } from '@/lib/predictions/engagement'
import { CONSCIOUS_FUND_GOAL_MXN } from '@/lib/predictions/fund-goal'
import { FundThermometer } from '@/components/fund/FundThermometer'

const Footer = dynamic(() => import('../components/Footer'))
const CookieConsent = dynamic(() => import('../components/CookieConsent'))
const SmartHomeClient = dynamic(() => import('./SmartHomeClient'))
const TrustedBrandsRow = dynamic(() =>
  import('@/components/landing/TrustedBrandsRow').then((m) => ({
    default: m.TrustedBrandsRow,
  }))
)

const MarketCard = dynamic(() =>
  import('@/components/MarketCard').then((m) => ({ default: m.MarketCard }))
)
const ImpactTicker = dynamic(() =>
  import('./components/landing/ImpactTicker').then((m) => ({ default: m.ImpactTicker }))
)
export const revalidate = 60

export const metadata: Metadata = {
  title: {
    absolute:
      'Crowd Conscious — Predicciones Gratis que Financian Causas Reales | Mundial 2026',
  },
  description:
    "Plataforma gratuita de predicciones donde cada voto genera impacto. Cada patrocinio financia causas reales; tú decides a dónde va el impacto. Mundial 2026, política, deportes y más.",
  alternates: {
    canonical: SITE_URL,
    languages: {
      "es-MX": SITE_URL,
      "en-US": SITE_URL,
    },
  },
  openGraph: {
    title:
      "Crowd Conscious — Predicciones Gratis que Financian Causas Reales | Mundial 2026",
    description:
      "Plataforma gratuita de predicciones donde cada voto genera impacto. Cada patrocinio financia causas reales; tú decides el impacto. Mundial 2026, política, deportes y más.",
    url: SITE_URL,
  },
}

function getCurrentCycle(): string {
  return new Date().toISOString().slice(0, 7)
}

/** ISO timestamp of the first day of the current calendar month (UTC). */
function cycleStartIso(): string {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
}

function groupOutcomesByMarket(
  rows: Array<{
    id: string
    market_id: string
    label: string
    probability: number
    sort_order: number | null
    translations?: unknown
  }>
): Record<string, MarketCardOutcome[]> {
  const out: Record<string, MarketCardOutcome[]> = {}
  for (const r of rows) {
    const mid = r.market_id
    if (!out[mid]) out[mid] = []
    out[mid].push({
      id: r.id,
      label: r.label,
      probability: Number(r.probability),
      sort_order: r.sort_order ?? 0,
      translations: r.translations,
    })
  }
  for (const id of Object.keys(out)) {
    out[id].sort((a, b) => b.probability - a.probability)
  }
  return out
}

async function getLandingData() {
  const supabase = await createClient()
  const cycle = getCurrentCycle()

  const [
    marketsRes,
    outcomesRes,
    fundBalance,
    causesRes,
    votesRes,
    worldCupRes,
    liveNowRes,
    activeMarketsCountRes,
    profilesCountRes,
    locFeaturedCountRes,
    locActiveCountRes,
    locTopRes,
    allTimeVotesRes,
    mundialFoundingTakenRes,
    cycleOpinionsRes,
  ] = await Promise.all([
    supabase
      .from('prediction_markets')
      .select(
        'id, title, description_short, category, current_probability, total_votes, image_url, sponsor_name, sponsor_logo_url, sponsor_url, translations, resolution_date, market_type, status'
      )
      .in('status', ['active', 'trading'])
      .is('archived_at', null)
      .eq('is_draft', false)
      // Only surface markets with enough engagement that probability bars are
      // credible. Below-threshold markets show misleading 0% / 100% bars on
      // the landing page and become anti-social-proof.
      .gte('total_votes', PUBLIC_MARKET_MIN_VOTES)
      .order('total_votes', { ascending: false, nullsFirst: false })
      .limit(6),
    supabase
      .from('market_outcomes')
      .select('id, market_id, label, probability, sort_order, translations')
      .order('probability', { ascending: false }),
    // Fund balance read via admin client so anon visitors see the real
    // number regardless of `conscious_fund` RLS state (see migration 198).
    fetchConsciousFundBalanceMxn(),
    // `slug` is added in migration 205_fund_causes_v2. `*` so this survives
    // the brief window between deploy and migration-apply without 500-ing
    // the landing page.
    supabase.from('fund_causes').select('*').eq('active', true).order('name'),
    supabase.from('fund_votes').select('cause_id').eq('cycle', cycle),
    supabase
      .from('prediction_markets')
      .select(
        'id, title, description_short, category, current_probability, total_votes, translations, resolution_date, market_type, status, image_url, sponsor_name, sponsor_logo_url, sponsor_url'
      )
      .eq('category', 'world_cup')
      .in('status', ['active', 'trading'])
      .eq('is_draft', false)
      .gte('total_votes', PUBLIC_MARKET_MIN_VOTES)
      .order('total_votes', { ascending: false, nullsFirst: false })
      .limit(4),
    supabase
      .from('live_events')
      .select('id, title, translations, total_votes_cast')
      .eq('status', 'live')
      .order('match_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('prediction_markets')
      .select('id', { count: 'exact', head: true })
      .in('status', ['active', 'trading'])
      .is('archived_at', null)
      .eq('is_draft', false),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase
      .from('conscious_locations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .eq('is_featured', true),
    supabase
      .from('conscious_locations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabase
      .from('conscious_locations')
      .select(
        'id, name, slug, category, city, neighborhood, why_conscious, why_conscious_en, user_benefits, user_benefits_en, cover_image_url, logo_url, instagram_handle, conscious_score, total_votes, certified_at, is_featured, sort_order, metadata'
      )
      .eq('status', 'active')
      .order('is_featured', { ascending: false })
      .order('sort_order', { ascending: true })
      .limit(3),
    supabase.from('prediction_markets').select('total_votes, engagement_count').is('archived_at', null),
    supabase
      .from('sponsorships')
      .select('id', { count: 'exact', head: true })
      .eq('tier', 'mundial_pack_founding')
      .in('status', ['active', 'completed']),
    // cycle_opinions — market_votes cast during the current calendar month.
    // Pairs with the ticker narrative "→ $X for [cause]" which is itself
    // cycle-scoped via `fund_votes.cycle`. See `docs/METRICS-CATALOG.md`.
    supabase
      .from('market_votes')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', cycleStartIso()),
  ])

  const markets = (marketsRes.data || []) as MarketCardMarket[]

  const outcomeRows = (outcomesRes.data || []) as Array<{
    id: string
    market_id: string
    label: string
    probability: number
    sort_order: number | null
    translations?: unknown
  }>
  const outcomesByMarketId = groupOutcomesByMarket(outcomeRows)

  const causes = (causesRes.data || []) as Array<{
    id: string
    name: string
    slug?: string | null
  }>
  const voteCountByCause: Record<string, number> = {}
  for (const v of votesRes.data || []) {
    const id = v.cause_id
    voteCountByCause[id] = (voteCountByCause[id] ?? 0) + 1
  }
  const causesWithVotes = causes
    .map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug ?? null,
      vote_count: voteCountByCause[c.id] ?? 0,
    }))
    .sort((a, b) => b.vote_count - a.vote_count)

  const worldCupMarkets = (worldCupRes.data || []) as MarketCardMarket[]

  const liveNowRow = liveNowRes.data as
    | { id: string; title: string; translations: Json | null; total_votes_cast?: number }
    | null

  // `allTimeVotesRes` remains available for other blocks, but the ticker
  // headline now uses cycle-scoped opinions (see `docs/METRICS-CATALOG.md`).
  const voteTotals = (allTimeVotesRes.data ?? []) as Array<{
    total_votes?: number | null
    engagement_count?: number | null
  }>
  // Retained for potential use elsewhere; not passed to ImpactTicker anymore.
  void voteTotals
  const totalVotes = cycleOpinionsRes.count ?? 0
  const fundTotal = fundBalance
  const activeCause = causesWithVotes[0] ?? causes[0] ?? null
  const activeCauseName = activeCause?.name ?? null
  const activeCauseSlug =
    (activeCause as { slug?: string | null } | null)?.slug ?? null

  const activeMarketCount = activeMarketsCountRes.count ?? markets.length
  const profileCount = profilesCountRes.count

  const locFeaturedCount = locFeaturedCountRes.count ?? 0
  const locActiveCount = locActiveCountRes.count ?? 0
  const showLocationsSection = locFeaturedCount >= 1 || locActiveCount >= 3

  const MUNDIAL_FOUNDING_TOTAL = 5
  const mundialFoundingTaken = Math.min(
    MUNDIAL_FOUNDING_TOTAL,
    mundialFoundingTakenRes.count ?? 0
  )
  const mundialFoundingRemaining = Math.max(
    0,
    MUNDIAL_FOUNDING_TOTAL - mundialFoundingTaken
  )
  const landingLocationCards = (locTopRes.data ?? []) as Array<{
    id: string
    name: string
    slug: string
    category: string
    city: string
    neighborhood: string | null
    why_conscious: string | null
    why_conscious_en: string | null
    user_benefits: string | null
    user_benefits_en: string | null
    cover_image_url: string | null
    logo_url: string | null
    instagram_handle: string | null
    conscious_score: number | null
    total_votes: number
    certified_at: string | null
  }>

  return {
    markets,
    outcomesByMarketId,
    fundBalance,
    causesCount: causes.length,
    causesWithVotes: causesWithVotes.slice(0, 3),
    worldCupMarkets,
    liveNowRow,
    totalVotes,
    fundTotal,
    activeCauseName,
    activeCauseSlug,
    activeMarketCount,
    profileCount,
    showLocationsSection,
    landingLocationCards,
    mundialFoundingRemaining,
  }
}

export default async function LandingPage() {
  const cookieStore = await cookies()
  const locale = cookieStore.get('preferred-language')?.value === 'en' ? 'en' : 'es'

  let markets: MarketCardMarket[] = []
  let outcomesByMarketId: Record<string, MarketCardOutcome[]> = {}
  let fundBalance = 0
  let causesWithVotes: Array<{
    id: string
    name: string
    slug: string | null
    vote_count: number
  }> = []
  let liveNowRow: Awaited<ReturnType<typeof getLandingData>>['liveNowRow'] = null
  let totalVotes = 0
  let fundTotal = 0
  let activeCauseName: string | null = null
  let activeCauseSlug: string | null = null
  let showLocationsSection = false
  let landingLocationCards: Awaited<ReturnType<typeof getLandingData>>['landingLocationCards'] = []
  let mundialFoundingRemaining = 0

  try {
    const data = await getLandingData()
    markets = data.markets
    outcomesByMarketId = data.outcomesByMarketId
    fundBalance = data.fundBalance
    causesWithVotes = data.causesWithVotes
    liveNowRow = data.liveNowRow
    totalVotes = data.totalVotes
    fundTotal = data.fundTotal
    activeCauseName = data.activeCauseName
    activeCauseSlug = data.activeCauseSlug
    showLocationsSection = data.showLocationsSection
    landingLocationCards = data.landingLocationCards
    mundialFoundingRemaining = data.mundialFoundingRemaining
  } catch (e) {
    console.error('Landing data fetch error:', e)
  }

  const localeShort: 'es' | 'en' = locale

  const top3Markets = markets.slice(0, 3)
  const top3Locations = landingLocationCards.slice(0, 3)

  return (
    <div className="min-h-screen overflow-x-hidden bg-cc-bg text-cc-text-primary">
      <SmartHomeClient />

      <LandingNav />

      <div className="pt-20">
        {liveNowRow && (
          <LiveEventBanner
            liveRow={liveNowRow}
            locale={localeShort}
            voteCount={liveNowRow.total_votes_cast ?? 0}
          />
        )}

        {/* ─────────── BLOCK 1 — Hero ─────────── */}
        <LandingHeroBlock locale={localeShort} fundBalance={fundBalance} />

        {/* Trusted Brands — self-hides below 3 logos so it never looks weak. */}
        <TrustedBrandsRow locale={localeShort} />

        <ImpactTicker
          totalVotes={totalVotes}
          fundTotal={fundTotal}
          activeCauseName={activeCauseName}
          activeCauseSlug={activeCauseSlug}
        />

        {/* ─────────── BLOCK 2 — Top 3 live markets ─────────── */}
        {top3Markets.length > 0 ? (
          <section className="mx-auto max-w-6xl px-4 py-14 md:px-8">
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  {locale === 'es' ? 'Lo que dice la comunidad' : 'What the community says'}
                </p>
                <h2 className="mt-1 text-2xl font-bold text-white md:text-3xl">
                  {locale === 'es' ? 'Top predicciones en vivo' : 'Top live predictions'}
                </h2>
              </div>
              <Link
                href="/markets"
                className="inline-flex min-h-[44px] items-center gap-1 self-start text-sm font-medium text-emerald-400 hover:text-emerald-300 sm:self-auto"
              >
                {locale === 'es' ? 'Ver todas' : 'View all'}
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 md:pb-0">
              {top3Markets.map((market) => (
                <div
                  key={market.id}
                  className="min-w-[88%] snap-start sm:min-w-[70%] md:min-w-0"
                >
                  <MarketCard
                    market={market}
                    outcomes={outcomesByMarketId[market.id] ?? []}
                  />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* ─────────── BLOCK 2.5 — Mundial Founding scarcity tile ─────────── */}
        {mundialFoundingRemaining > 0 ? (
          <section className="mx-auto max-w-6xl px-4 pb-6 md:px-8">
            <Link
              href="/pulse#mundial-pack"
              className="group block overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-amber-500/15 p-6 transition-all hover:border-amber-400/60 hover:from-amber-500/20 hover:to-amber-500/20 md:p-8"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-red-500" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">
                      {locale === 'es'
                        ? `Solo ${mundialFoundingRemaining} ${mundialFoundingRemaining === 1 ? 'marca Fundadora' : 'marcas Fundadoras'} restantes`
                        : `Only ${mundialFoundingRemaining} Founding ${mundialFoundingRemaining === 1 ? 'brand' : 'brands'} left`}
                    </p>
                  </div>
                  <h2 className="mb-2 text-xl font-bold text-white md:text-2xl">
                    {locale === 'es'
                      ? 'Edición Mundial 2026 — Solo 5 marcas Fundadoras'
                      : 'World Cup 2026 Edition — Only 5 Founding brands'}
                  </h2>
                  <p className="max-w-xl text-sm text-gray-300 md:text-base">
                    {locale === 'es'
                      ? 'Aparece frente a 20K+ fans mexicanos durante el torneo. 50% de descuento permanente y reconocimiento de por vida.'
                      : 'Appear in front of 20K+ Mexican fans during the tournament. 50% permanent discount and lifetime recognition.'}
                  </p>
                </div>
                <span className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-gray-900 shadow-lg shadow-amber-500/20 transition-all group-hover:bg-amber-400">
                  {locale === 'es' ? 'Ver plan' : 'See plan'}
                  <ChevronRight className="h-4 w-4" />
                </span>
              </div>
            </Link>
          </section>
        ) : null}

        {/* ─────────── BLOCK 3 — Conscious Locations ─────────── */}
        {showLocationsSection && top3Locations.length > 0 ? (
          <LandingLocationsSection
            locations={top3Locations as LocationCardRow[]}
            locale={localeShort}
          />
        ) : null}

        {/* ─────────── Below the fold ─────────── */}
        <BrandsMiniPitch locale={localeShort} />

        <section className="border-t border-cc-border bg-cc-bg px-4 py-16">
          <div className="mx-auto max-w-5xl">
            <div className="rounded-2xl border border-cc-border bg-cc-card/80 p-8 md:p-12">
              <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="mb-2 text-2xl font-bold text-white">
                    {locale === 'es' ? 'Fondo Consciente' : 'Conscious Fund'}
                  </h2>
                  <p className="mb-6 max-w-xl text-gray-400">
                    {locale === 'es'
                      ? 'Cada patrocinio financia causas reales. Tú decides a dónde va el impacto.'
                      : 'Every sponsorship funds real causes. You decide where the impact goes.'}
                  </p>
                  <div className="mb-6">
                    <FundThermometer
                      current={fundBalance}
                      goal={CONSCIOUS_FUND_GOAL_MXN}
                      currency="MXN"
                      variant="full"
                      locale={localeShort}
                    />
                  </div>
                  {causesWithVotes.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-500">
                        {locale === 'es' ? 'Causas con más votos' : 'Top causes by votes'}
                      </p>
                      {causesWithVotes.map((cause) => (
                        <div
                          key={cause.id}
                          className="flex justify-between border-b border-gray-800 py-2 last:border-0"
                        >
                          <span className="font-medium text-white">{cause.name}</span>
                          <span className="font-semibold text-emerald-400">
                            {cause.vote_count} {locale === 'es' ? 'votos' : 'votes'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Link
                  href="/predictions/fund"
                  className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl border border-emerald-500/50 bg-emerald-500/20 px-6 py-3 font-medium text-emerald-400 transition-colors hover:bg-emerald-500/30"
                >
                  {locale === 'es' ? 'Conoce el Fondo Consciente' : 'Learn about the Conscious Fund'}
                  <ChevronRight className="h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>

      <Footer />
      <CookieConsent />
    </div>
  )
}
