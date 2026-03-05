import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import dynamic from 'next/dynamic'
import { toDisplayPercent } from '@/lib/probability-utils'
import {
  Target,
  Vote,
  Heart,
  Globe,
  Building2,
  Briefcase,
  Users,
  Trophy,
  Leaf,
  ChevronRight,
  TrendingUp,
} from 'lucide-react'

const LandingNav = dynamic(() => import('./components/landing/LandingNav'))
const Footer = dynamic(() => import('../components/Footer'))
const CookieConsent = dynamic(() => import('../components/CookieConsent'))
const SmartHomeClient = dynamic(() => import('./SmartHomeClient'))

export const revalidate = 60

const CATEGORY_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; bg: string; text: string }
> = {
  world: { label: 'World', icon: Globe, bg: 'bg-blue-500/20', text: 'text-blue-400' },
  government: { label: 'Government', icon: Building2, bg: 'bg-red-500/20', text: 'text-red-400' },
  corporate: { label: 'Corporate', icon: Briefcase, bg: 'bg-purple-500/20', text: 'text-purple-400' },
  community: { label: 'Community', icon: Users, bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  cause: { label: 'Cause', icon: Heart, bg: 'bg-amber-500/20', text: 'text-amber-400' },
  world_cup: { label: 'World Cup', icon: Trophy, bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  sustainability: { label: 'Sustainability', icon: Leaf, bg: 'bg-green-500/20', text: 'text-green-400' },
}

async function getLandingData() {
  const supabase = await createClient()

  const [marketsRes, outcomesRes, fundRes, causesRes] = await Promise.all([
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
    supabase.from('fund_causes').select('id').eq('active', true),
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
  const causesCount = causesRes.data?.length ?? 0

  return {
    markets,
    outcomesByMarket,
    fundBalance: Number(fundBalance),
    causesCount,
  }
}

function formatCurrency(num: number): string {
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`
  return `$${num.toFixed(0)}`
}

export default async function LandingPage() {
  let markets: Awaited<ReturnType<typeof getLandingData>>['markets'] = []
  let outcomesByMarket: Awaited<ReturnType<typeof getLandingData>>['outcomesByMarket'] = {}
  let fundBalance = 0
  let causesCount = 0

  try {
    const data = await getLandingData()
    markets = data.markets
    outcomesByMarket = data.outcomesByMarket
    fundBalance = data.fundBalance
    causesCount = data.causesCount
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

        {/* Hero */}
        <section className="relative pt-24 pb-20 px-4 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-slate-950 to-slate-950" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="relative max-w-5xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight mb-6">
              Predict what matters.
              <br />
              <span className="text-emerald-400">Fund real change.</span>
            </h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
              Free predictions on the World Cup, your city, and the issues you care about. No money
              needed — brands sponsor the impact.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-lg transition-colors"
              >
                Start Predicting
              </Link>
              <Link
                href="/markets"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-slate-600 hover:border-slate-500 text-slate-200 font-semibold transition-colors"
              >
                Browse Markets
              </Link>
            </div>

            {/* Hero market cards */}
            {heroMarkets.length > 0 && (
              <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
                {heroMarkets.map((m) => {
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
                      className="block bg-slate-900/80 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors text-left"
                    >
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${config.bg} ${config.text}`}
                      >
                        <Icon className="w-3 h-3" />
                        {config.label}
                      </span>
                      <p className="font-medium text-white mt-2 line-clamp-2">{m.title}</p>
                      <p className="text-emerald-400 text-sm font-semibold mt-1">
                        {label} {prob}%
                      </p>
                      <p className="text-slate-500 text-xs mt-1">{votes} predictions</p>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 px-4 border-t border-slate-800">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-white text-center mb-12">
              How it works
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Pick a market</h3>
                <p className="text-slate-400">
                  World Cup, sustainability, policy, culture — choose what matters to you.
                </p>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4">
                  <Vote className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Share your prediction</h3>
                <p className="text-slate-400">
                  Vote with confidence. Earn XP. Climb the leaderboard.
                </p>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4">
                  <Heart className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Fund real impact</h3>
                <p className="text-slate-400">
                  Brand sponsors fund the Conscious Fund. Your engagement decides where it goes.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Live Markets Preview */}
        {previewMarkets.length > 0 && (
          <section className="py-20 px-4 border-t border-slate-800">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl font-bold text-white mb-2">Trending markets</h2>
              <p className="text-slate-400 mb-8">See what the crowd is predicting</p>
              <div className="space-y-3">
                {previewMarkets.map((m) => {
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
                      className="flex items-center justify-between gap-4 p-4 bg-slate-900/50 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <span
                          className={`shrink-0 inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${config.bg} ${config.text}`}
                        >
                          <Icon className="w-3 h-3" />
                          {config.label}
                        </span>
                        <p className="font-medium text-white truncate">{m.title}</p>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <span className="text-emerald-400 font-semibold">
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

        {/* Conscious Fund */}
        <section className="py-20 px-4 border-t border-slate-800">
          <div className="max-w-5xl mx-auto">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 md:p-12">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Every prediction drives real impact
                  </h2>
                  <p className="text-slate-400 mb-6 max-w-xl">
                    Brand sponsors fund the Conscious Fund. 80% of every sponsorship goes to community
                    causes; 20% supports platform operations. Your votes decide which causes receive
                    grants. No money from you — just your predictions.
                  </p>
                  {fundBalance > 0 || causesCount > 0 ? (
                    <div className="flex flex-wrap gap-6">
                      <div>
                        <p className="text-slate-500 text-sm">Fund total</p>
                        <p className="text-2xl font-bold text-emerald-400">
                          {formatCurrency(fundBalance)} MXN
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-sm">Causes funded</p>
                        <p className="text-2xl font-bold text-white">{causesCount}</p>
                      </div>
                    </div>
                  ) : (
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
                  Learn more
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
