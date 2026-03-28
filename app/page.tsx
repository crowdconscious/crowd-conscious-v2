import type { Metadata } from 'next'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { SITE_URL } from '@/lib/seo/site'
import { createClient } from '@/lib/supabase-server'
import type { Json } from '@/types/database'
import dynamic from 'next/dynamic'
import { Globe, Heart, Trophy, ChevronRight } from 'lucide-react'
import { LiveEventBanner } from './components/landing/LiveEventBanner'
import type { MarketCardMarket, MarketCardOutcome } from './components/landing/MarketCard'

const LandingNav = dynamic(() => import('./components/landing/LandingNav'))
const Footer = dynamic(() => import('../components/Footer'))
const CookieConsent = dynamic(() => import('../components/CookieConsent'))
const SmartHomeClient = dynamic(() => import('./SmartHomeClient'))

const MarketCard = dynamic(() =>
  import('./components/landing/MarketCard').then((m) => ({ default: m.MarketCard }))
)
const ImpactTicker = dynamic(() =>
  import('./components/landing/ImpactTicker').then((m) => ({ default: m.ImpactTicker }))
)
const SponsorCTA = dynamic(() =>
  import('./components/landing/SponsorCTA').then((m) => ({ default: m.SponsorCTA }))
)

export const revalidate = 60

export const metadata: Metadata = {
  title:
    "Crowd Conscious — Predicciones Gratis que Financian Causas Reales | Mundial 2026",
  description:
    "Plataforma gratuita de predicciones donde cada voto genera impacto. Predice en el Mundial 2026, política, deportes y más. 40% de patrocinios van a causas comunitarias.",
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
      "Plataforma gratuita de predicciones donde cada voto genera impacto. Mundial 2026, política, deportes y más.",
    url: SITE_URL,
  },
}

function getCurrentCycle(): string {
  return new Date().toISOString().slice(0, 7)
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
    fundRes,
    causesRes,
    votesRes,
    worldCupRes,
    liveNowRes,
  ] = await Promise.all([
    supabase
      .from('prediction_markets')
      .select(
        'id, title, category, current_probability, total_votes, image_url, sponsor_name, sponsor_logo_url, sponsor_url, translations, resolution_date, market_type, status'
      )
      .in('status', ['active', 'trading'])
      .order('total_votes', { ascending: false, nullsFirst: false })
      .limit(6),
    supabase
      .from('market_outcomes')
      .select('id, market_id, label, probability, sort_order, translations')
      .order('probability', { ascending: false }),
    supabase
      .from('conscious_fund')
      .select('current_balance, total_collected, total_disbursed')
      .limit(1)
      .single(),
    supabase.from('fund_causes').select('id, name').eq('active', true).order('name'),
    supabase.from('fund_votes').select('cause_id').eq('cycle', cycle),
    supabase
      .from('prediction_markets')
      .select(
        'id, title, category, current_probability, total_votes, translations, resolution_date, market_type, status, image_url, sponsor_name, sponsor_logo_url, sponsor_url'
      )
      .eq('category', 'world_cup')
      .in('status', ['active', 'trading'])
      .order('total_votes', { ascending: false, nullsFirst: false })
      .limit(4),
    supabase
      .from('live_events')
      .select('id, title, translations, total_votes_cast')
      .eq('status', 'live')
      .order('match_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
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

  const fundBalance = Number(fundRes.data?.current_balance ?? 0)
  const causes = (causesRes.data || []) as Array<{ id: string; name: string }>
  const voteCountByCause: Record<string, number> = {}
  for (const v of votesRes.data || []) {
    const id = v.cause_id
    voteCountByCause[id] = (voteCountByCause[id] ?? 0) + 1
  }
  const causesWithVotes = causes
    .map((c) => ({ ...c, vote_count: voteCountByCause[c.id] ?? 0 }))
    .sort((a, b) => b.vote_count - a.vote_count)

  const worldCupMarkets = (worldCupRes.data || []) as MarketCardMarket[]

  const liveNowRow = liveNowRes.data as
    | { id: string; title: string; translations: Json | null; total_votes_cast?: number }
    | null

  const totalVotes = markets.reduce((sum, m) => sum + (m.total_votes ?? 0), 0)
  const fundTotal = fundBalance
  const activeCauseName = causesWithVotes[0]?.name ?? causes[0]?.name ?? null

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
  }
}

function formatCurrency(num: number): string {
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`
  return `$${num.toFixed(0)}`
}

const WorldCupCountdown = dynamic(() =>
  import('./components/landing/WorldCupCountdown').then((m) => ({ default: m.WorldCupCountdown }))
)

export default async function LandingPage() {
  const cookieStore = await cookies()
  const locale = cookieStore.get('preferred-language')?.value === 'en' ? 'en' : 'es'

  let markets: MarketCardMarket[] = []
  let outcomesByMarketId: Record<string, MarketCardOutcome[]> = {}
  let fundBalance = 0
  let causesCount = 0
  let causesWithVotes: Array<{ id: string; name: string; vote_count: number }> = []
  let worldCupMarkets: MarketCardMarket[] = []
  let liveNowRow: Awaited<ReturnType<typeof getLandingData>>['liveNowRow'] = null
  let totalVotes = 0
  let fundTotal = 0
  let activeCauseName: string | null = null

  try {
    const data = await getLandingData()
    markets = data.markets
    outcomesByMarketId = data.outcomesByMarketId
    fundBalance = data.fundBalance
    causesCount = data.causesCount
    causesWithVotes = data.causesWithVotes
    worldCupMarkets = data.worldCupMarkets
    liveNowRow = data.liveNowRow
    totalVotes = data.totalVotes
    fundTotal = data.fundTotal
    activeCauseName = data.activeCauseName
  } catch (e) {
    console.error('Landing data fetch error:', e)
  }

  const localeShort: 'es' | 'en' = locale

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0f1419] text-slate-100">
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

        <ImpactTicker
          totalVotes={totalVotes}
          fundTotal={fundTotal}
          activeCauseName={activeCauseName}
        />

        <section className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white md:text-3xl">
                {locale === 'es' ? 'Predicciones populares' : 'Trending predictions'}
              </h1>
              <p className="mt-1 text-sm text-gray-400">
                {locale === 'es'
                  ? 'Tu opinión genera impacto real. 100% gratis.'
                  : 'Your opinion drives real impact. 100% free.'}
              </p>
            </div>
            <Link
              href="/markets"
              className="inline-flex min-h-[44px] items-center gap-1 text-sm font-medium text-emerald-400 hover:text-emerald-300"
            >
              {locale === 'es' ? 'Ver todas' : 'View all'}
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {markets.slice(0, 6).map((market) => (
              <MarketCard
                key={market.id}
                market={market}
                outcomes={outcomesByMarketId[market.id] ?? []}
              />
            ))}
          </div>

          {markets.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-lg text-gray-400">
                {locale === 'es'
                  ? 'Predicciones para el Mundial 2026 — próximamente'
                  : 'World Cup 2026 predictions — coming soon'}
              </p>
            </div>
          )}

          <div className="mt-10 text-center">
            <Link
              href="/signup"
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-emerald-600 sm:w-auto"
            >
              {locale === 'es' ? 'Empieza a predecir — es gratis' : "Start predicting — it's free"}
            </Link>
            <p className="mt-3 text-xs text-gray-500">
              {locale === 'es'
                ? 'Sin dinero real. Sin tarjeta. Solo tu opinión.'
                : 'No real money. No credit card. Just your opinion.'}
            </p>
          </div>
        </section>

        <section
          className="relative overflow-hidden border-t border-gray-800 px-4 py-16 md:px-8"
          style={{ backgroundImage: 'url(/images/worldcup-bg%20(1).png)', backgroundSize: 'cover' }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-[#0f1419]/90 via-[#0f1419]/95 to-[#0f1419]" />
          <div className="relative mx-auto max-w-5xl">
            <h2 className="mb-2 text-center text-2xl font-bold text-white md:text-3xl">
              ⚽{' '}
              {locale === 'es'
                ? 'Mundial 2026 — Ciudad de México'
                : 'World Cup 2026 — Mexico City'}
            </h2>
            <p className="mb-8 text-center text-sm text-gray-400">
              {locale === 'es'
                ? 'Partido inaugural 11 de junio en el Estadio Azteca.'
                : 'Opening match June 11 at Estadio Azteca.'}
            </p>
            <div className="mb-10 flex justify-center">
              <WorldCupCountdown />
            </div>
            {worldCupMarkets.length > 0 && (
              <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 md:grid-cols-2">
                {worldCupMarkets.map((m) => (
                  <MarketCard key={m.id} market={m} outcomes={outcomesByMarketId[m.id] ?? []} />
                ))}
              </div>
            )}
            <div className="mt-10 text-center">
              <Link
                href="/markets?category=world_cup"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-emerald-400"
              >
                {locale === 'es' ? 'Ver mercados del Mundial' : 'Browse World Cup markets'}
                <ChevronRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl border-t border-gray-800 px-4 py-12 md:px-8">
          <div className="grid grid-cols-1 gap-8 text-center md:grid-cols-3">
            <div>
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
                <Globe className="h-6 w-6 text-emerald-400" />
              </div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                {locale === 'es' ? 'Predice' : 'Predict'}
              </h3>
              <p className="text-sm leading-relaxed text-gray-300">
                {locale === 'es'
                  ? 'Vota en predicciones sobre deportes, política y más. 100% gratis.'
                  : 'Vote on predictions about sports, politics & more. 100% free.'}
              </p>
            </div>
            <div>
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
                <Heart className="h-6 w-6 text-emerald-400" />
              </div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                {locale === 'es' ? 'Impacta' : 'Impact'}
              </h3>
              <p className="text-sm leading-relaxed text-gray-300">
                {locale === 'es'
                  ? 'Marcas patrocinan mercados. 40% va al Fondo Consciente. Tú eliges la causa.'
                  : 'Brands sponsor markets. 40% goes to the Conscious Fund. You choose the cause.'}
              </p>
            </div>
            <div>
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
                <Trophy className="h-6 w-6 text-emerald-400" />
              </div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                {locale === 'es' ? 'Gana' : 'Win'}
              </h3>
              <p className="text-sm leading-relaxed text-gray-300">
                {locale === 'es'
                  ? 'Sube en el leaderboard y gana reconocimiento por tu inteligencia colectiva.'
                  : 'Climb the leaderboard and earn recognition for your collective intelligence.'}
              </p>
            </div>
          </div>
        </section>

        <SponsorCTA locale={localeShort} />

        <section
          className="relative border-t border-gray-800 px-4 py-16"
          style={{ backgroundImage: 'url(/images/fund-bg.png)', backgroundSize: 'cover' }}
        >
          <div className="absolute inset-0 bg-[#0f1419]/85" />
          <div className="relative mx-auto max-w-5xl">
            <div className="rounded-2xl border border-gray-800 bg-[#1a2029]/80 p-8 md:p-12">
              <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="mb-2 text-2xl font-bold text-white">
                    {locale === 'es' ? 'Fondo Consciente' : 'Conscious Fund'}
                  </h2>
                  <p className="mb-6 max-w-xl text-gray-400">
                    {locale === 'es'
                      ? 'El 40% de cada patrocinio va a causas comunitarias. Tú votas a dónde va el impacto.'
                      : '40% of every sponsorship goes to community causes. You vote where the impact goes.'}
                  </p>
                  {fundBalance > 0 || causesCount > 0 ? (
                    <div className="mb-6 flex flex-wrap gap-6">
                      <div>
                        <p className="text-sm text-gray-500">{locale === 'es' ? 'Total del fondo' : 'Fund total'}</p>
                        <p className="text-2xl font-bold text-emerald-400">{formatCurrency(fundBalance)} MXN</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">{locale === 'es' ? 'Causas' : 'Causes'}</p>
                        <p className="text-2xl font-bold text-white">{causesCount}</p>
                      </div>
                    </div>
                  ) : null}
                  {causesWithVotes.length > 0 && (
                    <div className="mb-6 space-y-2">
                      <p className="text-sm font-medium text-gray-500">
                        {locale === 'es' ? 'Causas con más votos' : 'Top causes by votes'}
                      </p>
                      {causesWithVotes.map((cause) => (
                        <div
                          key={cause.id}
                          className="flex justify-between border-b border-gray-800 py-2 last:border-0"
                        >
                          <span className="font-medium text-white">{cause.name}</span>
                          <span className="font-semibold text-emerald-400">{cause.vote_count} votes</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {fundBalance === 0 && causesCount === 0 && (
                    <p className="font-medium text-slate-200">
                      {locale === 'es'
                        ? 'Próximamente: el Fondo Consciente dirigirá patrocinios a causas elegidas por la comunidad.'
                        : 'Coming soon — the Conscious Fund will direct sponsor contributions to community-chosen causes.'}
                    </p>
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
