'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Sparkles,
  Vote,
  BarChart3,
  Bot,
} from 'lucide-react'
import { MiniSparkline } from './MiniSparkline'
import { OnboardingOverlay, shouldShowOnboarding } from './OnboardingOverlay'
import { toDisplayPercent } from '@/lib/probability-utils'
import type { Database } from '@/types/database'

type PredictionMarket = Database['public']['Tables']['prediction_markets']['Row']
type AgentContent = Database['public']['Tables']['agent_content']['Row']

type EnrichedPosition = {
  id: string
  market_id: string
  side: 'yes' | 'no'
  shares: number
  average_price: number | null
  costBasis: number
  currentValue: number
  pnl: number
  pnlPct: number
  currentPriceMxn: number
  prediction_markets: Pick<PredictionMarket, 'id' | 'title' | 'current_probability' | 'status'> | null
}

type MoverMarket = PredictionMarket & { oldProb: number; newProb: number; delta: number }

type UserPrediction = {
  id: string
  market_id: string
  outcome_label: string
  confidence: number
  xp_earned: number
  is_correct: boolean | null
  bonus_xp: number
  market_title: string
  market_status: string
}

interface DashboardData {
  userId: string
  userName: string
  totalXp: number
  accuracyPct: number
  correctPredictions: number
  totalResolvedPredictions: number
  userImpactXp: number
  fundBalance: number
  positions: EnrichedPosition[]
  userPredictions: UserPrediction[]
  biggestMovers: MoverMarket[]
  newMarkets: PredictionMarket[]
  agentContent: AgentContent[]
  allMarkets: PredictionMarket[]
  historyByMarket: Record<string, { probability: number; recorded_at: string }[]>
}

interface Props {
  data: DashboardData
}

function formatCurrency(num: number): string {
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`
  return `$${num.toFixed(2)}`
}

function formatPnl(pnl: number, pct: number): string {
  const sign = pnl >= 0 ? '+' : ''
  return `${sign}${formatCurrency(pnl)} (${sign}${pct.toFixed(1)}%)`
}

function truncate(str: string, len: number): string {
  if (str.length <= len) return str
  return str.slice(0, len) + '…'
}

export function PredictionsDashboardClient({ data }: Props) {
  const {
    userId,
    userName,
    totalXp,
    accuracyPct,
    userImpactXp,
    fundBalance,
    positions,
    userPredictions,
    biggestMovers,
    newMarkets,
    agentContent,
    allMarkets,
    historyByMarket,
  } = data

  const activeMarkets = allMarkets.filter((m) => m.status !== 'resolved')
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    if (userId && userPredictions.length === 0 && shouldShowOnboarding(false, userId)) {
      setShowOnboarding(true)
    }
  }, [userId, userPredictions.length])

  const trendingForOnboarding = newMarkets.length >= 3 ? newMarkets : activeMarkets.slice(0, 3)

  return (
    <div className="space-y-8 pb-24">
      {showOnboarding && (
        <OnboardingOverlay
          trendingMarkets={trendingForOnboarding}
          onDismiss={() => setShowOnboarding(false)}
        />
      )}
      {/* Section 1: Portfolio Summary */}
      <section>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Welcome back, {userName}
        </h1>
        <p className="text-slate-400 mt-1 text-sm">
          Your personalized intelligence hub
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Prediction Score</p>
            <p className="text-2xl font-bold text-white mt-1">
              {totalXp.toLocaleString()} XP
            </p>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Accuracy</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              {accuracyPct.toFixed(0)}%
            </p>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Your impact</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              {userImpactXp} XP
            </p>
          </div>
        </div>
      </section>

      {/* Section 2 & 3: Positions + Trending (two columns) */}
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Your Predictions - left ~60% */}
        <div className="lg:col-span-3">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            Your Predictions
          </h2>
          {userPredictions.length === 0 ? (
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-8 text-center">
              <p className="text-slate-400">You haven&apos;t made any predictions yet.</p>
              <Link
                href="/predictions/markets"
                className="inline-flex items-center gap-2 mt-3 text-emerald-400 hover:text-emerald-300 text-sm font-medium"
              >
                Browse markets <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {userPredictions.slice(0, 10).map((v) => {
                const hist = historyByMarket[v.market_id] || []
                const sparkData = hist.map((h) => ({ value: h.probability }))

                return (
                  <div
                    key={v.id}
                    className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-white truncate">{v.market_title}</p>
                      <p className="text-slate-400 text-sm mt-0.5">
                        Your pick: {v.outcome_label} at confidence {v.confidence}
                      </p>
                      <p className="text-emerald-400 text-sm font-medium mt-1">
                        +{v.xp_earned + v.bonus_xp} XP
                        {v.market_status === 'resolved' && (
                          <span className="ml-2">
                            {v.is_correct ? '✓ Correct' : '✗'}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <MiniSparkline
                        data={sparkData}
                        positive={v.is_correct !== false}
                        className="rounded"
                      />
                      <Link
                        href={`/predictions/markets/${v.market_id}`}
                        className="text-emerald-400 hover:text-emerald-300 text-sm font-medium flex items-center gap-1"
                      >
                        View <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Trending & Alerts - right ~40% */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-400" />
              Biggest Movers
            </h2>
            <div className="space-y-2">
              {biggestMovers.length === 0 ? (
                <p className="text-slate-500 text-sm">No significant moves in last 24h</p>
              ) : (
                biggestMovers.map((m) => (
                  <Link
                    key={m.id}
                    href={`/predictions/markets/${m.id}`}
                    className="block bg-slate-900/80 border border-slate-800 rounded-xl p-3 hover:border-slate-600 transition-colors"
                  >
                    <p className="font-medium text-white text-sm truncate">{m.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-slate-500 text-xs">{m.oldProb.toFixed(0)}%</span>
                      <ArrowRight className="w-3 h-3 text-slate-500" />
                      <span className="text-white text-xs font-medium">{m.newProb.toFixed(0)}%</span>
                      {m.delta >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-400" />
                      )}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-400" />
              New Markets
            </h2>
            <div className="space-y-2">
              {newMarkets.length === 0 ? (
                <p className="text-slate-500 text-sm">No new markets this week</p>
              ) : (
                newMarkets.slice(0, 5).map((m) => (
                  <Link
                    key={m.id}
                    href={`/predictions/markets/${m.id}`}
                    className="block bg-slate-900/80 border border-slate-800 rounded-xl p-3 hover:border-slate-600 transition-colors"
                  >
                    <p className="font-medium text-white text-sm truncate">{m.title}</p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      {Math.round(toDisplayPercent(Number(m.current_probability)))}% probability
                    </p>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: AI Pulse */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Bot className="w-5 h-5 text-violet-400" />
          AI Pulse
        </h2>
        {agentContent.length === 0 ? (
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-8 text-center">
            <p className="text-slate-400">AI insights coming soon</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {agentContent.map((ac) => (
              <div
                key={ac.id}
                className="bg-slate-900/80 border border-slate-800 rounded-xl p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
                    <Bot className="w-5 h-5 text-violet-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-white text-sm">{ac.title}</p>
                    <p className="text-slate-400 text-xs mt-1 line-clamp-2">
                      {ac.body?.slice(0, 100)}…
                    </p>
                    <p className="text-slate-500 text-xs mt-2">
                      {new Date(ac.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {agentContent.length > 0 && (
          <Link
            href="/predictions/insights"
            className="inline-flex items-center gap-2 mt-3 text-emerald-400 hover:text-emerald-300 text-sm font-medium"
          >
            View all insights <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </section>

      {/* Section 5: Conscious Fund Mini */}
      <section>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-slate-400 text-xs">Fund Balance</p>
              <p className="text-lg font-bold text-emerald-400">{formatCurrency(fundBalance)}</p>
            </div>
            <div className="h-8 w-px bg-slate-700" />
            <div>
              <p className="text-slate-400 text-xs">Your impact</p>
              <p className="text-lg font-bold text-white">{userImpactXp} XP</p>
            </div>
          </div>
          <Link
            href="/predictions/fund"
            className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-medium"
          >
            <Vote className="w-4 h-4" />
            Vote for causes <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Section 6: Market Overview */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Market Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {activeMarkets.slice(0, 8).map((m) => {
            const hist = historyByMarket[m.id] || []
            const sparkData = hist.map((h) => ({ value: toDisplayPercent(h.probability) }))
            const prob = toDisplayPercent(Number(m.current_probability))

            return (
              <Link
                key={m.id}
                href={`/predictions/markets/${m.id}`}
                className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 hover:border-slate-600 transition-colors flex items-center gap-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-white text-sm truncate">{truncate(m.title, 40)}</p>
                  <p className="text-emerald-400 text-sm font-semibold">{Math.round(prob)}%</p>
                </div>
                <MiniSparkline data={sparkData} positive={true} className="shrink-0 rounded" />
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
