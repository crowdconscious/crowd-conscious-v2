import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import dynamic from 'next/dynamic'
import { toDisplayPercent } from '@/lib/probability-utils'
import { Globe, Building2, Briefcase, Users, Trophy, Leaf, ChevronRight, Heart } from 'lucide-react'

const LandingNav = dynamic(() => import('./components/landing/LandingNav'))
const Footer = dynamic(() => import('../components/Footer'))
const CookieConsent = dynamic(() => import('../components/CookieConsent'))
const SmartHomeClient = dynamic(() => import('./SmartHomeClient'))
const LandingHeroClient = dynamic(() => import('./components/landing/LandingHeroClient').then((m) => ({ default: m.LandingHeroClient })))

export const revalidate = 60

const CATEGORY_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; bg: string; text: string; emoji: string }
> = {
  world: { label: 'World', icon: Globe, bg: 'bg-blue-500/20', text: 'text-blue-400', emoji: '🌍' },
  government: { label: 'Government', icon: Building2, bg: 'bg-red-500/20', text: 'text-red-400', emoji: '🏛' },
  corporate: { label: 'Corporate', icon: Briefcase, bg: 'bg-purple-500/20', text: 'text-purple-400', emoji: '🏢' },
  community: { label: 'Community', icon: Users, bg: 'bg-emerald-500/20', text: 'text-emerald-400', emoji: '👥' },
  cause: { label: 'Cause', icon: Heart, bg: 'bg-amber-500/20', text: 'text-amber-400', emoji: '💚' },
  world_cup: { label: 'World Cup', icon: Trophy, bg: 'bg-emerald-500/20', text: 'text-emerald-400', emoji: '⚽' },
  sustainability: { label: 'Sustainability', icon: Leaf, bg: 'bg-green-500/20', text: 'text-green-400', emoji: '🌱' },
}

function getCurrentCycle(): string {
  return new Date().toISOString().slice(0, 7)
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
  ] = await Promise.all([
    supabase
      .from('prediction_markets')
      .select('id, title, category, current_probability, total_votes, image_url, sponsor_name')
      .in('status', ['active', 'trading'])
      .order('total_votes', { ascending: false, nullsFirst: false })
      .limit(6),
    supabase
      .from('market_outcomes')
      .select('market_id, label, probability')
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
      .select('id, title, category, current_probability, total_votes')
      .eq('category', 'world_cup')
      .in('status', ['active', 'trading'])
      .order('total_votes', { ascending: false, nullsFirst: false })
      .limit(4),
  ])

  const markets = (marketsRes.data || []) as Array<{
    id: string
    title: string
    category: string
    current_probability: number
    total_votes: number | null
    image_url: string | null
    sponsor_name: string | null
  }>

  const outcomesByMarket: Record<string, { label: string; probability: number }> = {}
  for (const o of outcomesRes.data || []) {
    const id = o.market_id
    if (!outcomesByMarket[id]) {
      outcomesByMarket[id] = { label: o.label, probability: Number(o.probability) }
    }
  }

  const fundBalance = fundRes.data?.current_balance ?? 0
  const causes = (causesRes.data || []) as Array<{ id: string; name: string }>
  const voteCountByCause: Record<string, number> = {}
  for (const v of votesRes.data || []) {
    const id = v.cause_id
    voteCountByCause[id] = (voteCountByCause[id] ?? 0) + 1
  }
  const causesWithVotes = causes
    .map((c) => ({ ...c, vote_count: voteCountByCause[c.id] ?? 0 }))
    .sort((a, b) => b.vote_count - a.vote_count)
    .slice(0, 3)

  const worldCupMarkets = (worldCupRes.data || []) as Array<{
    id: string
    title: string
    category: string
    current_probability: number
    total_votes: number | null
  }>

  return {
    markets,
    outcomesByMarket,
    fundBalance: Number(fundBalance),
    causesCount: causes.length,
    causesWithVotes,
    worldCupMarkets,
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
  let markets: Awaited<ReturnType<typeof getLandingData>>['markets'] = []
  let outcomesByMarket: Awaited<ReturnType<typeof getLandingData>>['outcomesByMarket'] = {}
  let fundBalance = 0
  let causesCount = 0
  let causesWithVotes: Array<{ id: string; name: string; vote_count: number }> = []
  let worldCupMarkets: Awaited<ReturnType<typeof getLandingData>>['worldCupMarkets'] = []

  try {
    const data = await getLandingData()
    markets = data.markets
    outcomesByMarket = data.outcomesByMarket
    fundBalance = data.fundBalance
    causesCount = data.causesCount
    causesWithVotes = data.causesWithVotes
    worldCupMarkets = data.worldCupMarkets
  } catch (e) {
    console.error('Landing data fetch error:', e)
  }

  const heroMarkets = markets.slice(0, 3)
  const previewMarkets = markets.slice(0, 4)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden">
      <SmartHomeClient />

      <main>
        <LandingNav />

        <LandingHeroClient heroMarkets={heroMarkets} outcomesByMarket={outcomesByMarket} />

        {/* Live Markets Preview - Trending */}
        {previewMarkets.length > 0 && (
          <section className="py-20 px-4 border-t border-slate-800">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl font-bold text-white mb-2">Trending markets</h2>
              <p className="text-slate-400 mb-8">See what the crowd is predicting</p>
              <div className="space-y-0">
                {previewMarkets.map((m, i) => {
                  const config = CATEGORY_CONFIG[m.category] || CATEGORY_CONFIG.world
                  const Icon = config.icon
                  const leading = outcomesByMarket[m.id]
                  const prob = leading
                    ? Math.round(toDisplayPercent(leading.probability))
                    : Math.round(toDisplayPercent(Number(m.current_probability))) || 50
                  const label = leading?.label ?? 'YES'
                  const votes = m.total_votes ?? 0

                  return (
                    <Link
                      key={m.id}
                      href={`/predictions/markets/${m.id}`}
                      className={`flex items-center justify-between gap-4 p-4 border border-slate-800 rounded-xl hover:border-slate-700 hover:bg-slate-900/30 transition-colors ${
                        i % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-900/10'
                      }`}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <span className="shrink-0 text-slate-500 font-bold text-sm w-8">#{i + 1}</span>
                        <span
                          className={`shrink-0 inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${config.bg} ${config.text}`}
                        >
                          <span>{config.emoji}</span>
                          <Icon className="w-3 h-3" />
                          {config.label}
                        </span>
                        <p className="font-medium text-white truncate">{m.title}</p>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <span className="text-emerald-400 font-bold text-lg">
                          {label} {prob}%
                        </span>
                        <span className="text-slate-500 text-sm">{votes} votes</span>
                        <ChevronRight className="w-5 h-5 text-slate-500" />
                      </div>
                    </Link>
                  )
                })}
              </div>
              <div className="mt-8 text-center">
                <Link
                  href="/markets"
                  className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-medium"
                >
                  See all markets
                  <ChevronRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* World Cup 2026 Section */}
        <section className="relative py-24 px-4 border-t border-slate-800 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950" />
          <div className="relative max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-2">
              ⚽ World Cup 2026 is Coming to Mexico City
            </h2>
            <p className="text-slate-400 text-center mb-8">
              Opening match June 11 at Estadio Azteca. Predict the outcomes.
            </p>
            <div className="flex justify-center mb-10">
              <WorldCupCountdown />
            </div>
            {worldCupMarkets.length > 0 && (
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                {worldCupMarkets.map((m) => {
                  const leading = outcomesByMarket[m.id]
                  const prob = leading
                    ? Math.round(toDisplayPercent(leading.probability))
                    : Math.round(toDisplayPercent(Number(m.current_probability))) || 50
                  const label = leading?.label ?? 'YES'

                  return (
                    <Link
                      key={m.id}
                      href={`/predictions/markets/${m.id}`}
                      className="block bg-slate-900/60 border border-slate-700 rounded-xl p-4 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10 transition-all"
                    >
                      <p className="font-medium text-white line-clamp-2 text-sm">{m.title}</p>
                      <p className="text-emerald-400 font-bold mt-2">{label} {prob}%</p>
                    </Link>
                  )
                })}
              </div>
            )}
            <div className="text-center">
              <Link
                href="/markets?category=world_cup"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold transition-colors"
              >
                Browse World Cup Markets
                <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>

        {/* Conscious Fund */}
        <section className="py-20 px-4 border-t border-slate-800">
          <div className="max-w-5xl mx-auto">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 md:p-12">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    The Conscious Fund
                  </h2>
                  <p className="text-slate-400 mb-6 max-w-xl">
                    When brands sponsor markets, a portion goes to community causes. Users vote on where
                    the money goes. No money from you — just your predictions.
                  </p>
                  {fundBalance > 0 || causesCount > 0 ? (
                    <div className="flex flex-wrap gap-6 mb-6">
                      <div>
                        <p className="text-slate-500 text-sm">Fund total</p>
                        <p className="text-2xl font-bold text-emerald-400">
                          {formatCurrency(fundBalance)} MXN
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-sm">Causes</p>
                        <p className="text-2xl font-bold text-white">{causesCount}</p>
                      </div>
                    </div>
                  ) : null}
                  {causesWithVotes.length > 0 && (
                    <div className="space-y-2 mb-6">
                      <p className="text-slate-500 text-sm font-medium">Top causes by votes</p>
                      {causesWithVotes.map((cause) => (
                        <div
                          key={cause.id}
                          className="flex justify-between items-center py-2 border-b border-slate-800 last:border-0"
                        >
                          <span className="text-white font-medium">{cause.name}</span>
                          <span className="text-emerald-400 font-semibold">{cause.vote_count} votes</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {(fundBalance === 0 && causesCount === 0) && (
                    <p className="text-slate-200 font-medium">
                      Coming soon — the Conscious Fund will direct sponsor contributions to community
                      causes chosen by our users.
                    </p>
                  )}
                </div>
                <Link
                  href="/predictions/fund"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/30 font-medium transition-colors shrink-0"
                >
                  Learn more about the Conscious Fund
                  <ChevronRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 px-4 border-t border-slate-800">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to predict?
            </h2>
            <p className="text-slate-400 mb-8">
              Join the crowd. Make your first prediction and earn XP.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-lg transition-colors"
            >
              Start Predicting
            </Link>
          </div>
        </section>
      </main>

      <Footer />
      <CookieConsent />
    </div>
  )
}
