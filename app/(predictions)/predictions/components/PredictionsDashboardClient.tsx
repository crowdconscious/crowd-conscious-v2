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
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import ShareButton from '@/components/ShareButton'
import { MiniSparkline } from './MiniSparkline'
import { OnboardingOverlay, shouldShowOnboarding } from './OnboardingOverlay'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { toDisplayPercent } from '@/lib/probability-utils'
import { getMarketText } from '@/lib/i18n/market-translations'
import { useLocale } from '@/lib/i18n/useLocale'
import { relativeTime, stripMarkdown } from '@/lib/utils'
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

function ProbabilityBar({ value }: { value: number }) {
  const color = value > 60 ? '#10b981' : value > 30 ? '#f59e0b' : '#ef4444'
  return (
    <div
      className="mt-1.5 h-[3px] w-full rounded-sm"
      style={{ background: 'rgba(255,255,255,0.08)' }}
    >
      <div
        className="h-full rounded-sm transition-[width] duration-500 ease-out"
        style={{ width: `${value}%`, background: color }}
      />
    </div>
  )
}

const agentIcons: Record<string, string> = {
  ceo_digest: '📋',
  content_creator: '✍️',
  news_monitor: '📰',
  inbox_curator: '📥',
}

const contentTypeLabels: Record<string, string> = {
  ceo_digest: 'CEO Digest',
  daily_digest: 'Daily Digest',
  news_summary: 'News Brief',
  social_post: 'Social Post',
  market_suggestion: 'Market Suggestion',
  inbox_digest: 'Inbox Digest',
  weekly_digest: 'Weekly Digest',
  market_insight: 'Market Insight',
  sponsor_report: 'Sponsor Report',
}

export function PredictionsDashboardClient({ data }: Props) {
  const locale = useLocale()
  const {
    userId,
    userName,
    totalXp,
    accuracyPct,
    totalResolvedPredictions,
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
  const [predictionsExpanded, setPredictionsExpanded] = useState(false)
  const activePredictionCount = userPredictions.filter((v) => v.market_status !== 'resolved').length

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

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-[14px] border border-white/[0.07] bg-white/[0.03] p-5">
            <p className="text-slate-400 text-sm">Prediction Score</p>
            <p className="text-2xl font-bold text-white mt-1">
              {totalXp.toLocaleString()} XP
            </p>
          </div>
          <div className="rounded-[14px] border border-white/[0.07] bg-white/[0.03] p-5">
            <p className="text-slate-400 text-sm">Accuracy</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              {totalResolvedPredictions === 0 ? '—' : `${accuracyPct.toFixed(0)}%`}
            </p>
            {totalResolvedPredictions === 0 && (
              <p className="text-slate-500 text-xs mt-0.5">No resolved markets yet</p>
            )}
          </div>
          <div className="rounded-[14px] border border-white/[0.07] bg-white/[0.03] p-5">
            <p className="text-slate-400 text-sm">Your impact</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              {userImpactXp} XP
            </p>
          </div>
        </div>
      </section>

      {/* Two-column layout */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
        {/* LEFT COLUMN */}
        <div className="space-y-5">
          {/* Quick Actions */}
          <div className="rounded-[14px] border border-white/[0.07] bg-white/[0.03] p-5">
            <QuickActions
              predictionCount={activePredictionCount}
              fundBalance={fundBalance}
              impactXp={userImpactXp}
            />
          </div>

          {/* Collapsible Predictions */}
          <div
            id="your-predictions"
            className="rounded-[14px] border border-white/[0.07] bg-white/[0.03] p-5"
          >
            <button
              type="button"
              onClick={() => setPredictionsExpanded((e) => !e)}
              className="flex w-full items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-emerald-400" />
                <h2 className="text-lg font-semibold text-white">Your Predictions</h2>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400">
                  {userPredictions.length}
                </span>
              </div>
              <div className="flex items-center gap-1 text-slate-400 text-sm">
                {predictionsExpanded ? 'Collapse' : 'Expand all'}
                {predictionsExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </button>

            {userPredictions.length === 0 ? (
              <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
                <p className="text-slate-400">You haven&apos;t made any predictions yet.</p>
                <Link
                  href="/predictions/markets"
                  className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-emerald-400 hover:text-emerald-300"
                >
                  Browse markets <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {(predictionsExpanded ? userPredictions : userPredictions.slice(0, 2)).map((v) => {
                  const hist = historyByMarket[v.market_id] || []
                  const sparkData = hist.map((h) => ({ value: h.probability }))

                  return (
                    <div
                      key={v.id}
                      className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-white">{v.market_title}</p>
                        <p className="mt-0.5 text-sm text-slate-400">
                          Your pick: {v.outcome_label} at confidence {v.confidence}
                        </p>
                        <p className="mt-1 text-sm font-medium text-emerald-400">
                          +{v.xp_earned + v.bonus_xp} XP
                          {v.market_status === 'resolved' && (
                            <span className="ml-2">{v.is_correct ? '✓ Correct' : '✗'}</span>
                          )}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <MiniSparkline
                          data={sparkData}
                          positive={v.is_correct !== false}
                          className="rounded"
                        />
                        <ShareButton marketId={v.market_id} title={v.market_title} compact />
                        <Link
                          href={`/predictions/markets/${v.market_id}`}
                          className="flex items-center gap-1 text-sm font-medium text-emerald-400 hover:text-emerald-300"
                        >
                          View <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  )
                })}
                {!predictionsExpanded && userPredictions.length > 2 && (
                  <button
                    type="button"
                    onClick={() => setPredictionsExpanded(true)}
                    className="w-full rounded-xl border border-dashed border-white/[0.06] bg-white/[0.02] px-4 py-3 text-center text-sm text-slate-400 hover:bg-white/[0.04] hover:text-slate-300"
                  >
                    + {userPredictions.length - 2} more predictions · Click to expand
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Market Overview — bottom of left column */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-white">Market Overview</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {activeMarkets.slice(0, 8).map((m) => {
                const hist = historyByMarket[m.id] || []
                const sparkData = hist.map((h) => ({ value: toDisplayPercent(h.probability) }))
                const prob = toDisplayPercent(Number(m.current_probability))

                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 rounded-[14px] border border-white/[0.07] bg-white/[0.03] p-3 transition-colors hover:border-white/10"
                  >
                    <Link
                      href={`/predictions/markets/${m.id}`}
                      className="flex min-w-0 flex-1 items-center gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">
                          {truncate(m.title ?? '', 40)}
                        </p>
                        <p className="text-sm font-semibold text-emerald-400">
                          {Math.round(prob)}%
                        </p>
                        <ProbabilityBar value={Math.round(prob)} />
                      </div>
                      <MiniSparkline
                        data={sparkData}
                        positive={true}
                        className="shrink-0 rounded"
                      />
                    </Link>
                    <div onClick={(e) => e.stopPropagation()}>
                      <ShareButton marketId={m.id} title={m.title ?? ''} compact />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN — sidebar */}
        <div className="space-y-5">
          {/* AI Pulse */}
          <div>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
              <Bot className="h-5 w-5 text-violet-400" />
              AI Pulse
            </h2>
            {!agentContent || agentContent.length === 0 ? (
              <p
                className="text-[13px] italic"
                style={{ color: 'rgba(255,255,255,0.35)' }}
              >
                Los agentes están recopilando información...
              </p>
            ) : (
              <div className="space-y-2.5">
                {agentContent.slice(0, 3).map((ac) => {
                  const meta = (ac.metadata as Record<string, unknown>) ?? {}
                  const digestType = meta.digest_type as string | undefined
                  const typeKey = digestType === 'ceo_digest' ? 'ceo_digest' : ac.content_type
                  const label =
                    contentTypeLabels[typeKey] ??
                    contentTypeLabels[ac.content_type] ??
                    ac.content_type
                  const icon =
                    agentIcons[digestType as string] ??
                    agentIcons[ac.agent_type] ??
                    '📋'

                  return (
                    <div
                      key={ac.id}
                      className="rounded-[10px] border border-white/[0.06] bg-white/[0.03] px-3.5 py-3"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-base">{icon}</span>
                        <span
                          className="rounded-lg px-1.5 py-0.5 text-[10px] font-semibold"
                          style={{
                            background: 'rgba(16,185,129,0.12)',
                            color: '#10b981',
                          }}
                        >
                          {label}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {relativeTime(ac.created_at)}
                        </span>
                      </div>
                      <p className="truncate text-sm font-semibold text-white">{ac.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                        {stripMarkdown(ac.body ?? '').slice(0, 150)}…
                      </p>
                      <Link
                        href="/predictions/insights"
                        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300"
                      >
                        Leer más →
                      </Link>
                    </div>
                  )
                })}
                <Link
                  href="/predictions/insights"
                  className="inline-flex items-center gap-2 text-sm font-medium text-emerald-400 hover:text-emerald-300"
                >
                  Ver todo →
                </Link>
              </div>
            )}
          </div>

          {/* Biggest Movers */}
          <div>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
              <TrendingUp className="h-5 w-5 text-amber-400" />
              Biggest Movers
            </h2>
            <div className="space-y-2">
              {biggestMovers.length === 0 ? (
                <p className="text-sm text-slate-500">No significant moves in last 24h</p>
              ) : (
                biggestMovers.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-2 rounded-[14px] border border-white/[0.07] bg-white/[0.03] p-3 transition-colors hover:border-white/10"
                  >
                    <Link href={`/predictions/markets/${m.id}`} className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {getMarketText(m, 'title', locale)}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-xs text-slate-500">{m.oldProb.toFixed(0)}%</span>
                        <ArrowRight className="h-3 w-3 text-slate-500" />
                        <span className="text-xs font-medium text-white">
                          {m.newProb.toFixed(0)}%
                        </span>
                        {m.delta >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-400" />
                        )}
                      </div>
                    </Link>
                    <div onClick={(e) => e.stopPropagation()}>
                      <ShareButton
                        marketId={m.id}
                        title={getMarketText(m, 'title', locale)}
                        compact
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* New Markets */}
          <div>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
              <Sparkles className="h-5 w-5 text-blue-400" />
              New Markets
            </h2>
            <div className="space-y-2">
              {newMarkets.length === 0 ? (
                <p className="text-sm text-slate-500">No new markets this week</p>
              ) : (
                newMarkets.slice(0, 5).map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-2 rounded-[14px] border border-white/[0.07] bg-white/[0.03] p-3 transition-colors hover:border-white/10"
                  >
                    <Link href={`/predictions/markets/${m.id}`} className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {getMarketText(m, 'title', locale)}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {Math.round(toDisplayPercent(Number(m.current_probability)))}% probability
                      </p>
                    </Link>
                    <div onClick={(e) => e.stopPropagation()}>
                      <ShareButton
                        marketId={m.id}
                        title={getMarketText(m, 'title', locale)}
                        compact
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Conscious Fund widget */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-[14px] border border-white/[0.07] bg-white/[0.03] px-5 py-4">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs text-slate-400">Fund Balance</p>
                <p className="text-lg font-bold text-emerald-400">
                  {formatCurrency(fundBalance)}
                </p>
              </div>
              <div className="h-8 w-px bg-slate-700" />
              <div>
                <p className="text-xs text-slate-400">Your impact</p>
                <p className="text-lg font-bold text-white">{userImpactXp} XP</p>
              </div>
            </div>
            <Link
              href="/predictions/fund"
              className="inline-flex items-center gap-2 font-medium text-emerald-400 hover:text-emerald-300"
            >
              <Vote className="h-4 w-4" />
              Vote for causes <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
