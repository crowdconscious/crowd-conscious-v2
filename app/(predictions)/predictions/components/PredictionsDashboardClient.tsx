'use client'

import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { ArrowRight, BarChart3 } from 'lucide-react'
import ShareButton from '@/components/ShareButton'
import { OnboardingOverlay, shouldShowOnboarding } from './OnboardingOverlay'
import { AttentionFeed, type AttentionItem } from '@/components/dashboard/AttentionFeed'
import { toDisplayPercent } from '@/lib/probability-utils'
import { getMarketText } from '@/lib/i18n/market-translations'
import { useLocale } from '@/lib/i18n/useLocale'
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
  voted_at: string
  market_title: string
  market_status: string
  resolved_at: string | null
}

interface DashboardData {
  userId: string
  userName: string
  isAdmin: boolean
  totalXp: number
  accuracyPct: number
  correctPredictions: number
  totalResolvedPredictions: number
  userImpactXp: number
  fundBalance: number
  currentStreak: number
  lastActivityMs: number
  positions: EnrichedPosition[]
  userPredictions: UserPrediction[]
  recentlyResolvedForUser: UserPrediction[]
  biggestMovers: MoverMarket[]
  newMarkets: PredictionMarket[]
  agentContent: AgentContent[]
  allMarkets: PredictionMarket[]
  historyByMarket: Record<string, { probability: number; recorded_at: string }[]>
  lastVoteByMarket: Record<string, number>
  draftBlogCount: number
  pendingMarketSuggestions: number
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

type ActivityLevel = 'active' | 'slow' | 'inactive' | 'none'

function activityLevelFromLastVote(lastVoteMs: number | undefined): ActivityLevel {
  if (!lastVoteMs) return 'none'
  const now = Date.now()
  const hoursSince = (now - lastVoteMs) / (1000 * 60 * 60)
  if (hoursSince < 24) return 'active'
  if (hoursSince < 24 * 3) return 'slow'
  return 'inactive'
}

function activityLabel(level: ActivityLevel): string {
  switch (level) {
    case 'active':
      return 'Activo — votos en las últimas 24h'
    case 'slow':
      return 'Lento — sin votos en 3+ días'
    case 'inactive':
      return 'Inactivo — sin votos en 7+ días'
    case 'none':
      return 'Sin votos registrados'
  }
}

function ActivityDot({ level }: { level: ActivityLevel }) {
  const color =
    level === 'active'
      ? 'bg-emerald-400'
      : level === 'slow'
        ? 'bg-amber-400'
        : level === 'inactive'
          ? 'bg-red-400'
          : 'bg-slate-600'
  return (
    <span
      className={`h-2 w-2 shrink-0 rounded-full ${color}`}
      title={activityLabel(level)}
      aria-label={activityLabel(level)}
    />
  )
}

function leadingOutcomePct(m: PredictionMarket): number {
  return Math.round(toDisplayPercent(Number(m.current_probability)))
}

const DashboardIntelligenceColumnLazy = dynamic(
  () =>
    import('./DashboardIntelligenceColumn').then((m) => ({
      default: m.DashboardIntelligenceColumn,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse space-y-5 rounded-[14px] border border-white/[0.07] bg-[#1a2029] p-5 min-h-[24rem]">
        <div className="h-6 w-40 rounded bg-slate-800" />
        <div className="h-32 rounded-xl bg-slate-800/80" />
        <div className="h-32 rounded-xl bg-slate-800/80" />
        <div className="h-24 rounded-xl bg-slate-800/80" />
      </div>
    ),
  }
)

export function PredictionsDashboardClient({ data }: Props) {
  const locale = useLocale()
  const {
    userId,
    userName,
    isAdmin,
    totalXp,
    accuracyPct,
    correctPredictions,
    totalResolvedPredictions,
    userImpactXp,
    currentStreak,
    lastActivityMs,
    userPredictions,
    recentlyResolvedForUser,
    biggestMovers,
    newMarkets,
    agentContent,
    allMarkets,
    lastVoteByMarket,
    draftBlogCount,
    pendingMarketSuggestions,
    fundBalance,
  } = data

  const activeMarkets = allMarkets.filter((m) => m.status !== 'resolved')
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    if (userId && userPredictions.length === 0 && shouldShowOnboarding(false, userId)) {
      setShowOnboarding(true)
    }
  }, [userId, userPredictions.length])

  const trendingForOnboarding = newMarkets.length >= 3 ? newMarkets : activeMarkets.slice(0, 3)

  // Streak: considered "at risk" if last activity was yesterday or older.
  // Show a nudge row so the user doesn't lose their streak.
  const streakAtRisk = (() => {
    if (currentStreak < 2) return false
    if (!lastActivityMs) return false
    const today = new Date()
    const lastDay = new Date(lastActivityMs)
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
    const lastActivityDay = new Date(
      lastDay.getFullYear(),
      lastDay.getMonth(),
      lastDay.getDate()
    ).getTime()
    return lastActivityDay < startOfToday
  })()

  const attentionItems: AttentionItem[] = useMemo(() => {
    const items: AttentionItem[] = []

    if (recentlyResolvedForUser.length > 0) {
      if (recentlyResolvedForUser.length === 1) {
        const only = recentlyResolvedForUser[0]
        items.push({
          id: `resolved-${only.id}`,
          kind: 'resolved_market',
          title: `Se resolvió: ${only.market_title}`,
          href: `/predictions/markets/${only.market_id}`,
          cta: 'Ver resultado',
          emphasis: 'urgent',
        })
      } else {
        items.push({
          id: 'resolved-summary',
          kind: 'resolved_market',
          title: `${recentlyResolvedForUser.length} predicciones se resolvieron esta semana`,
          href: '#your-predictions',
          cta: 'Ver resultados',
          emphasis: 'urgent',
        })
      }
    }

    if (streakAtRisk) {
      items.push({
        id: 'streak',
        kind: 'streak',
        title: `Racha de ${currentStreak} días — vota hoy para mantenerla`,
        href: '/predictions/markets',
        cta: 'Votar',
        emphasis: 'urgent',
      })
    }

    if (isAdmin) {
      if (pendingMarketSuggestions > 0) {
        items.push({
          id: 'market-suggestions',
          kind: 'market_suggestions',
          title: `${pendingMarketSuggestions} sugerencias de mercados por revisar`,
          href: '/predictions/admin/agents',
          cta: 'Revisar',
        })
      }
      if (draftBlogCount > 0) {
        items.push({
          id: 'blog-drafts',
          kind: 'blog_drafts',
          title: `${draftBlogCount} ${draftBlogCount === 1 ? 'borrador de blog listo' : 'borradores de blog listos'} para revisar`,
          href: '/predictions/admin/agents',
          cta: 'Revisar',
        })
      }
    }

    return items
  }, [
    recentlyResolvedForUser,
    streakAtRisk,
    currentStreak,
    isAdmin,
    draftBlogCount,
    pendingMarketSuggestions,
  ])

  // Market Overview list: sort by vote count desc, show first 10. Compute
  // activity level + leading pct once per market for stable rendering.
  const overviewMarkets = useMemo(() => {
    return activeMarkets
      .slice()
      .sort((a, b) => Number(b.total_votes ?? 0) - Number(a.total_votes ?? 0))
      .slice(0, 10)
      .map((m) => {
        const votes = Number(m.total_votes ?? 0)
        const level = activityLevelFromLastVote(lastVoteByMarket[m.id])
        return {
          market: m,
          votes,
          level,
          leadingPct: leadingOutcomePct(m),
        }
      })
  }, [activeMarkets, lastVoteByMarket])

  // Recent predictions (top 5 by voted_at desc, resolved-first-in-7d).
  const recentPredictions = useMemo(() => {
    const recentlyResolvedIds = new Set(recentlyResolvedForUser.map((v) => v.id))
    const resolvedFirst = [...userPredictions].sort((a, b) => {
      const aRecent = recentlyResolvedIds.has(a.id) ? 1 : 0
      const bRecent = recentlyResolvedIds.has(b.id) ? 1 : 0
      if (aRecent !== bRecent) return bRecent - aRecent
      return new Date(b.voted_at).getTime() - new Date(a.voted_at).getTime()
    })
    return resolvedFirst.slice(0, 5)
  }, [userPredictions, recentlyResolvedForUser])

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
            <p className="text-slate-500 text-xs mt-0.5">XP total de la plataforma</p>
          </div>
          <div className="rounded-[14px] border border-white/[0.07] bg-white/[0.03] p-5">
            <p className="text-slate-400 text-sm">Accuracy</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              {totalResolvedPredictions === 0 ? '—' : `${accuracyPct.toFixed(0)}%`}
            </p>
            <p className="text-slate-500 text-xs mt-0.5">
              {totalResolvedPredictions === 0
                ? 'Aún sin mercados resueltos'
                : `${correctPredictions} de ${totalResolvedPredictions} acertadas`}
            </p>
          </div>
          <div className="rounded-[14px] border border-white/[0.07] bg-white/[0.03] p-5">
            <p className="text-slate-400 text-sm">Prediction XP</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              {userImpactXp.toLocaleString()} XP
            </p>
            <p className="text-slate-500 text-xs mt-0.5">Ganado por votar + acertar</p>
          </div>
        </div>
      </section>

      {/* Two-column layout */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
        {/* LEFT COLUMN */}
        <div className="space-y-5">
          {/* Attention feed — replaces the old "What you can do" block */}
          <div className="rounded-[14px] border border-white/[0.07] bg-white/[0.03] p-5">
            <AttentionFeed
              items={attentionItems}
              emptyMessage="Todo al día. Nada urgente por ahora."
              emptyHref="/predictions/markets"
              emptyCta="Explorar mercados nuevos"
            />
          </div>

          {/* Your Predictions — 5 most recent, resolved-first */}
          <div
            id="your-predictions"
            className="rounded-[14px] border border-white/[0.07] bg-white/[0.03] p-5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-emerald-400" />
                <h2 className="text-lg font-semibold text-white">Your Predictions</h2>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400">
                  {userPredictions.length}
                </span>
              </div>
              {userPredictions.length > 5 ? (
                <Link
                  href="/predictions/trades"
                  className="flex items-center gap-1 text-sm font-medium text-emerald-400 hover:text-emerald-300"
                >
                  Ver todas ({userPredictions.length})
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : null}
            </div>

            {recentlyResolvedForUser.length > 0 && (
              <div className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] px-4 py-3">
                <p className="text-sm text-emerald-100">
                  {recentlyResolvedForUser.length === 1
                    ? '1 predicción se resolvió esta semana'
                    : `${recentlyResolvedForUser.length} predicciones se resolvieron esta semana`}{' '}
                  — revisa los resultados abajo.
                </p>
              </div>
            )}

            {userPredictions.length === 0 ? (
              <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
                <p className="text-slate-300 text-lg">🎯 Aún no has hecho predicciones.</p>
                <p className="text-slate-400 mt-1">¡Haz tu primera predicción!</p>
                <Link
                  href="/predictions/markets"
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
                >
                  Explorar mercados <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {recentPredictions.map((v) => {
                  const resolvedBadge =
                    v.market_status === 'resolved'
                      ? v.is_correct
                        ? { label: '✓ Acertaste', tone: 'text-emerald-400' }
                        : { label: '✗ Fallaste', tone: 'text-red-400' }
                      : null

                  return (
                    <div
                      key={v.id}
                      className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-white">{v.market_title}</p>
                        <p className="mt-0.5 text-sm text-slate-400">
                          Votaste: {v.outcome_label} · confianza {v.confidence}
                        </p>
                        <p className="mt-1 text-sm font-medium text-emerald-400">
                          +{v.xp_earned + v.bonus_xp} XP
                          {resolvedBadge && (
                            <span className={`ml-2 ${resolvedBadge.tone}`}>
                              {resolvedBadge.label}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <ShareButton marketId={v.market_id} title={v.market_title} compact />
                        <Link
                          href={`/predictions/markets/${v.market_id}`}
                          className="flex items-center gap-1 text-sm font-medium text-emerald-400 hover:text-emerald-300"
                        >
                          Ver <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  )
                })}
                {userPredictions.length > 5 ? (
                  <Link
                    href="/predictions/trades"
                    className="block rounded-xl border border-dashed border-white/[0.06] bg-white/[0.02] px-4 py-3 text-center text-sm text-slate-300 hover:bg-white/[0.04]"
                  >
                    Ver todas tus predicciones ({userPredictions.length}) →
                  </Link>
                ) : null}
              </div>
            )}
          </div>

          {/* Market Overview — ranked list */}
          <div>
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Resumen de mercados</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Ordenados por votos. El punto verde = actividad en 24h · ámbar = sin votos en 3+
                  días · rojo = 7+ días.
                </p>
              </div>
              <Link
                href="/predictions/markets"
                className="flex shrink-0 items-center gap-1 text-sm font-medium text-emerald-400 hover:text-emerald-300"
              >
                Ver todos <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            {overviewMarkets.length === 0 ? (
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-center text-sm text-slate-400">
                No hay mercados activos por ahora.
              </div>
            ) : (
              <div className="space-y-1">
                {overviewMarkets.map(({ market: m, votes, level, leadingPct }, i) => {
                  const title = getMarketText(m, 'title', locale)
                  const hasQuorum = votes >= 5
                  return (
                    <div
                      key={m.id}
                      className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 transition-colors hover:border-white/10 hover:bg-white/[0.04]"
                    >
                      <Link
                        href={`/predictions/markets/${m.id}`}
                        className="flex min-w-0 flex-1 items-center gap-3"
                      >
                        <span className="w-6 shrink-0 font-mono text-sm text-slate-500">
                          {i + 1}
                        </span>
                        <p className="line-clamp-2 flex-1 text-sm text-slate-200">{title}</p>
                      </Link>
                      <div className="flex shrink-0 items-center gap-4">
                        <span className="hidden text-xs text-slate-400 sm:inline">
                          {votes} {votes === 1 ? 'voto' : 'votos'}
                        </span>
                        <span
                          className={`w-12 text-right text-sm font-medium tabular-nums ${
                            hasQuorum ? 'text-emerald-400' : 'text-slate-500'
                          }`}
                          title={hasQuorum ? 'Probabilidad líder' : 'Necesita 5 votos para mostrar %'}
                        >
                          {hasQuorum ? `${leadingPct}%` : `${votes}/5`}
                        </span>
                        <ActivityDot level={level} />
                        <div onClick={(e) => e.stopPropagation()}>
                          <ShareButton marketId={m.id} title={title} compact />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <DashboardIntelligenceColumnLazy
          locale={locale}
          agentContent={agentContent}
          biggestMovers={biggestMovers}
          newMarkets={newMarkets}
          fundBalance={fundBalance}
          userImpactXp={userImpactXp}
        />
      </section>
    </div>
  )
}
