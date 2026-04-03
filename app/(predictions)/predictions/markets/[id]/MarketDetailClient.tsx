'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Globe,
  Building2,
  Briefcase,
  Users,
  Heart,
  Trophy,
  Leaf,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ExternalLink,
  TrendingUp,
  Calendar,
  BarChart3,
  Newspaper,
  BarChart2,
  Bell,
  PenLine,
  FileText,
  CheckCircle2,
  Tag,
  User,
  Map,
  Cpu,
  Clapperboard,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { VotePanel, type GuestVotePayload } from '../../components/VotePanel'
import { GuestRegistrationPrompt } from '../../components/GuestRegistrationPrompt'
import { CelebrationModal } from '@/components/gamification/CelebrationModal'
import {
  getOrCreateGuestId,
  getGuestVoteDetail,
  getVotedGuestIdForMarket,
  setMarketGuestVote,
} from '@/lib/guest-vote-storage'
import ShareButton from '@/components/ShareButton'
import { toDisplayPercent } from '@/lib/probability-utils'
import { getMarketText, getOutcomeLabel } from '@/lib/i18n/market-translations'
import { useLocale } from '@/lib/i18n/useLocale'
import {
  celebrationRecordedMessage,
  isPulseLikeMarket,
  recentActivityEmpty,
  recentActivityHeading,
  userContributionLine,
  voteUpdatedToast,
} from '@/lib/i18n/pulse-market-copy'
import type { Database } from '@/types/database'

type PredictionMarket = Database['public']['Tables']['prediction_markets']['Row']
type AgentContent = Database['public']['Tables']['agent_content']['Row']
type SentimentScore = { score: number; source: string; recorded_at: string }
type TradeAnon = { side: string; amount: number; price: number; shares?: number; price_per_share_mxn?: number; created_at: string }

const CATEGORY_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; bg: string; text: string }
> = {
  world: { label: 'World', icon: Globe, bg: 'bg-blue-500/20', text: 'text-blue-400' },
  pulse: { label: 'Pulse', icon: BarChart3, bg: 'bg-amber-500/10', text: 'text-amber-400' },
  government: { label: 'Government', icon: Building2, bg: 'bg-red-500/20', text: 'text-red-400' },
  geopolitics: { label: 'Geopolitics', icon: Map, bg: 'bg-sky-500/20', text: 'text-sky-400' },
  corporate: { label: 'Corporate', icon: Briefcase, bg: 'bg-purple-500/20', text: 'text-purple-400' },
  community: { label: 'Community', icon: Users, bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  cause: { label: 'Cause', icon: Heart, bg: 'bg-amber-500/20', text: 'text-amber-400' },
  world_cup: { label: 'World Cup', icon: Trophy, bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  sustainability: { label: 'Sustainability', icon: Leaf, bg: 'bg-green-500/20', text: 'text-green-400' },
  technology: { label: 'Technology', icon: Cpu, bg: 'bg-violet-500/20', text: 'text-violet-400' },
  economy: { label: 'Economy', icon: TrendingUp, bg: 'bg-teal-500/20', text: 'text-teal-400' },
  entertainment: { label: 'Entertainment', icon: Clapperboard, bg: 'bg-fuchsia-500/20', text: 'text-fuchsia-400' },
}

const PULSE_CATEGORY = {
  label: 'Conscious Pulse',
  icon: BarChart3,
  bg: 'bg-amber-500/10',
  text: 'text-amber-400',
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function marketAvgConfidenceFromOutcomes(outcomes: Outcome[]): number | null {
  let sum = 0
  let votes = 0
  for (const o of outcomes) {
    const vc = o.vote_count ?? 0
    if (vc <= 0) continue
    sum += Number(o.total_confidence ?? 0)
    votes += vc
  }
  if (votes === 0) return null
  return Math.round((sum / votes) * 10) / 10
}

function formatRelativeTime(d: string): string {
  const now = Date.now()
  const then = new Date(d).getTime()
  const diffMs = now - then
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return 'hace un momento'
  if (diffMins < 60) return `hace ${diffMins} minuto${diffMins === 1 ? '' : 's'}`
  if (diffHours < 24) return `hace ${diffHours} hora${diffHours === 1 ? '' : 's'}`
  if (diffDays < 7) return `hace ${diffDays} día${diffDays === 1 ? '' : 's'}`
  return formatDate(d)
}

function getSentimentLabel(score: number): string {
  if (score < -60) return 'Muy Negativo'
  if (score < -20) return 'Negativo'
  if (score <= 20) return 'Neutral'
  if (score <= 60) return 'Positivo'
  return 'Muy Positivo'
}

const AGENT_ICONS: Record<string, React.ElementType> = {
  news_monitor: Newspaper,
  sentiment_tracker: BarChart2,
  data_watchdog: Bell,
  content_creator: PenLine,
}

type Outcome = { id: string; label: string; probability: number; vote_count: number; total_confidence: number; is_winner: boolean | null }
type MyVote = { outcome_id: string; outcome_label: string; confidence: number; xp_earned: number; is_correct: boolean | null; bonus_xp: number } | null

export type RelatedMarketSummary = {
  id: string
  title: string
  translations?: { en?: { title?: string } } | null
  total_votes: number | null
  is_pulse: boolean
  category: string
}

interface Props {
  market: PredictionMarket
  creatorName: string
  history: Array<{ probability: number; volume_24h: number; trade_count: number; recorded_at: string }>
  agentContent: AgentContent[]
  sentiment: SentimentScore[]
  trades: TradeAnon[]
  /** All votes + anonymous — reach / social proof */
  engagementCount: number
  /** Registered vote rows only — community probability denominator */
  registeredVoteCount: number
  totalConsciousFromMarket: number
  resolutionEvidence?: { evidence_url?: string; admin_notes?: string }
  outcomes?: Outcome[]
  myVote?: MyVote
  /** When false, anonymous votes use /api/votes/anonymous + localStorage guest id */
  isAuthenticated?: boolean
  /** Admin or linked sponsor account owner — Pulse public results */
  showPulseDashboardLink?: boolean
  relatedMarkets?: RelatedMarketSummary[]
  /** Platform admin — show edit market link */
  isAdmin?: boolean
}

type TimeRange = '7d' | '30d' | 'all'

export function MarketDetailClient({
  market,
  creatorName,
  history: historyProp = [],
  agentContent: agentContentProp = [],
  sentiment: sentimentProp = [],
  trades: tradesProp = [],
  engagementCount,
  registeredVoteCount,
  totalConsciousFromMarket: totalConsciousProp = 0,
  resolutionEvidence = {},
  outcomes = [],
  myVote = null,
  isAuthenticated = true,
  showPulseDashboardLink = false,
  relatedMarkets = [],
  isAdmin = false,
}: Props) {
  const locale = useLocale()
  const loc = locale === 'en' ? 'en' : 'es'
  const router = useRouter()
  const [researchOpen, setResearchOpen] = useState(false)
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')
  const [guestId, setGuestId] = useState<string>('')
  const [guestVoteRecord, setGuestVoteRecord] = useState<GuestVotePayload | null>(null)
  const [registerPromptOpen, setRegisterPromptOpen] = useState(false)
  const [celebration, setCelebration] = useState<{
    open: boolean
    xpGained?: number
    guest?: boolean
  }>({ open: false })
  const [voteQuietMessage, setVoteQuietMessage] = useState<string | null>(null)
  const [lazyExtra, setLazyExtra] = useState<{
    history: Props['history']
    agentContent: AgentContent[]
    sentiment: SentimentScore[]
    trades: TradeAnon[]
    totalConsciousFromMarket: number
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    setLazyExtra(null)
    fetch(`/api/predictions/markets/${market.id}/supplementary`)
      .then((r) => r.json())
      .then((d: { error?: string; history?: Props['history']; agentContent?: AgentContent[]; sentiment?: SentimentScore[]; trades?: TradeAnon[]; totalConsciousFromMarket?: number }) => {
        if (cancelled || d.error) return
        setLazyExtra({
          history: d.history ?? [],
          agentContent: d.agentContent ?? [],
          sentiment: d.sentiment ?? [],
          trades: d.trades ?? [],
          totalConsciousFromMarket: Number(d.totalConsciousFromMarket ?? 0),
        })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [market.id])

  const history = lazyExtra?.history ?? historyProp
  const agentContent = lazyExtra?.agentContent ?? agentContentProp
  const sentiment = lazyExtra?.sentiment ?? sentimentProp
  const trades = lazyExtra?.trades ?? tradesProp
  const totalConsciousFromMarket = lazyExtra ? lazyExtra.totalConsciousFromMarket : totalConsciousProp
  const secondaryLoading = !lazyExtra

  useEffect(() => {
    if (isAuthenticated) {
      setGuestVoteRecord(null)
      setGuestId('')
      return
    }
    const gid = getOrCreateGuestId()
    setGuestId(gid)
    const voted = getVotedGuestIdForMarket(market.id)
    if (gid && voted === gid) {
      setGuestVoteRecord(getGuestVoteDetail(market.id))
    } else {
      setGuestVoteRecord(null)
    }
  }, [market.id, isAuthenticated])

  useEffect(() => {
    if (!celebration.open || !celebration.guest) return
    const t = window.setTimeout(() => {
      setCelebration({ open: false })
      setRegisterPromptOpen(true)
    }, 3000)
    return () => clearTimeout(t)
  }, [celebration.open, celebration.guest])

  const isPulseMarket = isPulseLikeMarket(market as Parameters<typeof isPulseLikeMarket>[0])
  const config = isPulseMarket ? PULSE_CATEGORY : CATEGORY_CONFIG[market.category] || CATEGORY_CONFIG.world
  const Icon = config.icon
  const prob = toDisplayPercent(Number(market.current_probability))
  const isMultiOutcome = (market as { market_type?: string }).market_type === 'multi' && outcomes.length > 2
  const probs = outcomes.map((o) => Number(o.probability ?? 0))
  const maxP = probs.length ? Math.max(...probs) : 0
  const minP = probs.length ? Math.min(...probs) : 0
  const allOutcomesTied = outcomes.length >= 2 && maxP === minP
  const leadingOutcome =
    outcomes.length > 0 && !allOutcomesTied
      ? outcomes.reduce((a, b) => ((a?.probability ?? 0) > (b?.probability ?? 0) ? a : b))
      : null

  const now = Date.now()
  const filteredHistory = history.filter((h) => {
    if (timeRange === 'all') return true
    const t = new Date(h.recorded_at).getTime()
    const days = timeRange === '7d' ? 7 : 30
    return t >= now - days * 24 * 60 * 60 * 1000
  })

  const historyChartData = filteredHistory.map((h) => ({
    date: new Date(h.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }),
    fullDate: new Date(h.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    probability: toDisplayPercent(Number(h.probability)),
    volume: Number(h.trade_count) || Number(h.volume_24h),
  }))

  const sentimentChartData = sentiment.map((s) => ({
    date: new Date(s.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    score: Number(s.score),
  }))

  const latestSentiment = sentiment[0] ? Number(sentiment[0].score) : 0

  const handleTradeSuccess = (payload?: {
    xpEarned?: number
    isUpdate?: boolean
    noChange?: boolean
  }) => {
    if (payload?.noChange) {
      setVoteQuietMessage(locale === 'es' ? 'Sin cambios' : 'No changes')
      window.setTimeout(() => setVoteQuietMessage(null), 2500)
      return
    }
    if (payload?.isUpdate) {
      setVoteQuietMessage(voteUpdatedToast(loc, isPulseMarket))
      window.setTimeout(() => setVoteQuietMessage(null), 3500)
      router.refresh()
      return
    }
    setCelebration({ open: true, xpGained: payload?.xpEarned, guest: false })
  }

  const handleAnonymousVoteSuccess = (payload: GuestVotePayload, _meta?: { total_votes?: number }) => {
    if (!guestId) return
    setMarketGuestVote(market.id, guestId, payload)
    setGuestVoteRecord(payload)
    setCelebration({ open: true, guest: true })
    router.refresh()
  }

  const handleCelebrationClose = () => {
    const wasGuest = celebration.guest
    setCelebration({ open: false })
    if (wasGuest) {
      setRegisterPromptOpen(true)
    } else {
      window.location.reload()
    }
  }

  const isResolved = market.status === 'resolved'
  const resolutionLabel = (market as { resolution?: string }).resolution ?? (market.resolved_outcome ? 'YES' : 'NO')
  const resolvedDate = market.resolved_at ? formatDate(market.resolved_at) : ''
  const avgConfidenceHero = marketAvgConfidenceFromOutcomes(outcomes)

  return (
    <div className="space-y-6 pb-8">
      <Link
        href="/predictions"
        className="inline-flex items-center gap-1 text-sm text-cc-text-secondary transition-colors hover:text-cc-text-primary"
      >
        ← Back to markets
      </Link>

      {voteQuietMessage && (
        <div
          role="status"
          className="rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-100"
        >
          {voteQuietMessage}
        </div>
      )}

      {!isResolved && (
        <div className="rounded-2xl border border-white/10 bg-cc-card px-4 py-4 -mx-1 sm:mx-0">
          <div className="flex items-center justify-between gap-3 mb-3">
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                isPulseMarket
                  ? 'bg-amber-500/10 text-amber-400'
                  : 'bg-emerald-500/10 text-emerald-400'
              }`}
            >
              {isPulseMarket ? '📊 Conscious Pulse' : `🌐 ${config.label}`}
            </span>
            <span className="text-xs text-gray-500">
              {engagementCount.toLocaleString()}{' '}
              {isPulseMarket
                ? locale === 'es'
                  ? 'opiniones'
                  : 'opinions'
                : locale === 'es'
                  ? 'predicciones'
                  : 'predictions'}
            </span>
          </div>
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight flex-1 min-w-0">
              {getMarketText(market, 'title', locale)}
            </h1>
            <div className="shrink-0 pt-0.5 flex items-center gap-2">
              {isAdmin && (
                <Link
                  href={`/predictions/admin/edit-market/${market.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-400 transition-colors hover:border-emerald-500/30 hover:text-emerald-400"
                >
                  ✏️ {locale === 'es' ? 'Editar' : 'Edit'}
                </Link>
              )}
              <ShareButton
                marketId={market.id}
                title={getMarketText(market, 'title', locale)}
                sponsorName={(market as { sponsor_name?: string }).sponsor_name}
                compact
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-xs text-gray-500">
            {isPulseMarket && avgConfidenceHero != null && (
              <span>
                {locale === 'es' ? 'Confianza promedio' : 'Avg confidence'}: {avgConfidenceHero}/10
              </span>
            )}
            <span>
              {locale === 'es' ? 'Cierra' : 'Closes'} {formatDate(market.resolution_date)}
            </span>
          </div>
          {(market as { sponsor_name?: string }).sponsor_name && (
            <div className="flex items-center gap-2 mt-3 py-2 px-3 bg-white/[0.03] rounded-lg">
              {(market as { sponsor_logo_url?: string }).sponsor_logo_url ? (
                <Image
                  src={(market as { sponsor_logo_url?: string }).sponsor_logo_url!}
                  alt=""
                  width={20}
                  height={20}
                  className="h-5 w-5 rounded object-contain shrink-0"
                  unoptimized
                />
              ) : null}
              <span className="text-xs text-gray-400">
                {locale === 'es' ? 'Patrocinado por' : 'Sponsored by'}{' '}
                {(market as { sponsor_name?: string }).sponsor_name}
              </span>
            </div>
          )}
        </div>
      )}

      {isResolved && (
        <div className="lg:hidden rounded-2xl border border-white/10 bg-cc-card px-4 py-4 -mx-1 sm:mx-0">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-xl font-bold text-white leading-tight">{getMarketText(market, 'title', locale)}</h1>
            {isAdmin && (
              <Link
                href={`/predictions/admin/edit-market/${market.id}`}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-400 transition-colors hover:border-emerald-500/30 hover:text-emerald-400"
              >
                ✏️ {locale === 'es' ? 'Editar' : 'Edit'}
              </Link>
            )}
          </div>
        </div>
      )}

      {isResolved && (
        <div className="bg-emerald-500/20 border border-emerald-500/50 rounded-xl p-6">
          <h2 className="text-xl font-bold text-emerald-400 mb-2">
            RESOLVED: {resolutionLabel} on {resolvedDate}
          </h2>
          {resolutionEvidence?.evidence_url && (
            <a
              href={resolutionEvidence.evidence_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-emerald-300 hover:text-emerald-200 text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              View resolution evidence
            </a>
          )}
          <p className="text-slate-300 mt-2">
            {engagementCount.toLocaleString()} participation{engagementCount !== 1 ? 's' : ''} ·{' '}
            {registeredVoteCount.toLocaleString()} registered voter{registeredVoteCount !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[65%_35%] gap-8">
        {/* Left Column — stats, charts, discussion (order-2 on mobile so VotePanel shows first) */}
        <div className="space-y-6 order-2 lg:order-1">
          {/* Title lives in the hero above; desktop-only meta */}
          <div className="hidden lg:block">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text} mb-3`}
            >
              <Icon className="w-3.5 h-3.5" />
              {config.label}
            </span>
            <div className="flex items-center justify-between gap-4 mb-2">
              <h2 className="text-2xl font-bold text-white flex-1 min-w-0">{getMarketText(market, 'title', locale)}</h2>
              <ShareButton marketId={market.id} title={getMarketText(market, 'title', locale)} sponsorName={(market as { sponsor_name?: string }).sponsor_name} />
            </div>
            <p className="text-slate-400 text-sm">
              Created by {creatorName} on {formatDate(market.created_at)}
            </p>
            <span
              className={`inline-block mt-2 px-2.5 py-1 rounded text-xs font-medium ${
                market.status === 'resolved'
                  ? 'bg-gray-600 text-slate-300'
                  : 'bg-emerald-500/20 text-emerald-400'
              }`}
            >
              {market.status}
            </span>
          </div>

          {/* Sponsor Banner — full card on large screens; compact sponsor is in the hero on mobile */}
          {(market as { sponsor_name?: string }).sponsor_name && (
            <div className="hidden lg:flex bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                {(market as { sponsor_logo_url?: string }).sponsor_logo_url ? (
                  <Image
                    src={(market as { sponsor_logo_url?: string }).sponsor_logo_url!}
                    alt={(market as { sponsor_name?: string }).sponsor_name || ''}
                    width={48}
                    height={48}
                    className="w-12 h-12 object-contain rounded shrink-0"
                    unoptimized
                  />
                ) : (
                  <div className="w-12 h-12 bg-amber-500/20 rounded flex items-center justify-center shrink-0">
                    <span className="text-amber-400 font-bold">
                      {(market as { sponsor_name?: string }).sponsor_name?.[0] || '?'}
                    </span>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-white">
                    🤝 Sponsored by {(market as { sponsor_name?: string }).sponsor_name}
                  </p>
                  <p className="text-slate-400 text-sm">
                    {locale === 'es'
                      ? `Patrocinado por ${(market as { sponsor_name?: string }).sponsor_name}. Hasta el 40% financia causas comunitarias.`
                      : `Sponsored by ${(market as { sponsor_name?: string }).sponsor_name}. Up to 40% funds community causes.`}
                  </p>
                </div>
              </div>
              {(market as { sponsor_url?: string }).sponsor_url && (
                <a
                  href={(market as { sponsor_url?: string }).sponsor_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 font-medium text-sm transition-colors"
                >
                  Visit <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          )}

          {isPulseMarket && showPulseDashboardLink && (
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/pulse/${market.id}`}
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20"
              >
                📊 {locale === 'es' ? 'Ver Panel Pulse' : 'View Pulse Dashboard'}
              </Link>
            </div>
          )}

          {/* Probability + engagement (registered vs total reach) */}
          <div className="bg-cc-card border border-cc-border rounded-xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-6">
              <div className="flex flex-wrap gap-8 items-end">
                <div>
                  <p className="text-slate-400 text-sm">
                    {locale === 'en' ? 'Community probability' : 'Probabilidad de la comunidad'}
                  </p>
                  <p className="text-3xl font-bold text-emerald-400">
                    {isMultiOutcome && allOutcomesTied
                      ? locale === 'es'
                        ? 'Empate — sin líder aún'
                        : 'Equal — no leading outcome yet'
                      : isMultiOutcome && leadingOutcome
                        ? `${getOutcomeLabel(leadingOutcome, locale)} ${Math.round(toDisplayPercent(leadingOutcome.probability || 0))}%`
                        : `${Math.round(prob)}% YES`}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {locale === 'en'
                      ? 'Community signal · all votes (registered + guests)'
                      : 'Señal de la comunidad · todos los votos (registrados e invitados)'}
                    {registeredVoteCount > 0 && registeredVoteCount < engagementCount ? (
                      <span>
                        {' '}
                        · {registeredVoteCount.toLocaleString()}{' '}
                        {locale === 'en' ? 'registered' : 'registrados'} ·{' '}
                        {(engagementCount - registeredVoteCount).toLocaleString()}{' '}
                        {locale === 'en' ? 'guests' : 'invitados'}
                      </span>
                    ) : null}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">
                    {locale === 'en' ? 'Total participation' : 'Participación total'}
                  </p>
                  <p className="text-2xl font-semibold text-white">
                    {engagementCount.toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {locale === 'en' ? 'Vote rows (same pool as probability)' : 'Filas de voto (misma base que la probabilidad)'}
                  </p>
                </div>
              </div>
              <div
                className="relative h-24 w-24 rounded-full flex items-center justify-center shrink-0 mx-auto sm:mx-0"
                style={{
                  background: `conic-gradient(#10b981 0% ${prob}%, #334155 ${prob}% 100%)`,
                }}
              >
                <span className="absolute inset-0 m-auto flex h-16 w-16 items-center justify-center rounded-full bg-cc-bg text-2xl font-bold text-white">
                  {Math.round(prob)}%
                </span>
              </div>
            </div>
            <div className="h-3 bg-gray-800 rounded-full overflow-hidden flex mb-6">
              {isMultiOutcome && outcomes.length > 0 ? (
                outcomes.map((o, i) => (
                  <div
                    key={o.id}
                    className="h-full transition-all"
                    style={{
                      width: `${toDisplayPercent(o.probability || 0)}%`,
                      backgroundColor: i === 0 ? '#10b981' : ['#ef4444', '#f59e0b', '#6366f1'][(i - 1) % 3] + '99',
                    }}
                  />
                ))
              ) : (
                <>
                  <div
                    className="bg-emerald-500 h-full transition-all"
                    style={{ width: `${prob}%` }}
                  />
                  <div
                    className="bg-red-500/60 h-full transition-all"
                    style={{ width: `${100 - prob}%` }}
                  />
                </>
              )}
            </div>

            {secondaryLoading && (
              <div className="space-y-3 mt-4" aria-hidden>
                <div className="h-40 rounded-lg bg-slate-800/60 animate-pulse" />
                <div className="h-24 rounded-lg bg-slate-800/40 animate-pulse" />
              </div>
            )}

            {!secondaryLoading && historyChartData.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-slate-400 text-sm">Probability (from prediction_market_history)</p>
                  <div className="flex gap-2">
                    {(['7d', '30d', 'all'] as const).map((range) => (
                      <button
                        key={range}
                        onClick={() => setTimeRange(range)}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                          timeRange === range
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {range === 'all' ? 'All' : range.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={historyChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                        labelStyle={{ color: '#94a3b8' }}
                        formatter={(value: number) => [`${value.toFixed(1)}%`, 'Probability']}
                        labelFormatter={(label, payload) => {
                          const p = payload[0]?.payload
                          return p?.fullDate ?? label
                        }}
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null
                          const p = payload[0].payload
                          return (
                            <div className="bg-gray-800 border border-cc-border-light rounded-lg p-3 shadow-xl">
                              <p className="text-slate-300 text-sm font-medium">{p.fullDate}</p>
                              <p className="text-emerald-400 font-semibold">{toDisplayPercent(Number(p.probability)).toFixed(1)}%</p>
                              <p className="text-slate-400 text-xs">Votes: {Number(p.volume) || 0}</p>
                            </div>
                          )
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="probability"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-slate-400 text-sm mt-3">Probability history</p>
                <div className="h-32 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={historyChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="volume"
                        stroke="#0ea5e9"
                        fill="#0ea5e9"
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>

          {/* Sentiment Gauge - only show when we have data */}
          {sentiment.length > 0 && (
            <div className="bg-cc-card border border-cc-border rounded-xl p-6">
              <h3 className="font-semibold text-white mb-3">
                Sentimiento: {getSentimentLabel(latestSentiment)}
              </h3>
              <div className="relative h-4 bg-gradient-to-r from-red-500 via-yellow-500 to-emerald-500 rounded-full overflow-visible mb-2">
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-6 bg-white border-2 border-cc-border rounded-sm shadow-md transition-all z-10"
                  style={{
                    left: `${Math.min(100, Math.max(0, ((latestSentiment + 100) / 200) * 100))}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-400 mb-4">
                <span>-100</span>
                <span className="text-white font-medium">{latestSentiment.toFixed(0)}</span>
                <span>+100</span>
              </div>
              {sentimentChartData.length >= 2 && (
                <div className="h-12">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[...sentimentChartData].reverse().slice(-10)}>
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="#a855f7"
                        strokeWidth={1.5}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Research Center — Understand This Issue */}
          <div className="bg-cc-card border border-cc-border rounded-xl overflow-hidden">
            <button
              onClick={() => setResearchOpen(!researchOpen)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-800/50 transition-colors"
            >
              <span className="font-semibold text-white">Understand This Issue</span>
              {researchOpen ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </button>
            <AnimatePresence>
              {researchOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-cc-border"
                >
                  <div className="p-4 space-y-5">
                    {/* Description */}
                    <div className="rounded-lg bg-gray-800/50 p-4 border border-cc-border/50">
                      <h4 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        {locale === 'en' ? 'Description' : 'Descripción'}
                      </h4>
                      <p className="text-white text-sm leading-relaxed">
                        {getMarketText(market, 'description', locale) || (locale === 'en' ? 'No description available.' : 'No hay descripción disponible.')}
                      </p>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-cc-border/70" />

                    {/* How This Resolves — visually distinct, key for credibility */}
                    <div className="rounded-lg bg-emerald-500/5 p-4 border border-emerald-500/20">
                      <h4 className="text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        {locale === 'en' ? 'How This Resolves' : 'Cómo se resuelve'}
                      </h4>
                      <p className="text-white text-sm leading-relaxed">
                        {getMarketText(market, 'resolution_criteria', locale) ||
                          (locale === 'en'
                            ? 'No specific resolution criteria defined.'
                            : 'No se ha definido un criterio de resolución específico.')}
                      </p>
                    </div>

                    {/* Meta footer */}
                    <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2 text-sm text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        {locale === 'en' ? 'Resolution date' : 'Fecha de resolución'}:{' '}
                        <span className="text-white">{formatDate(market.resolution_date)}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Tag className="w-4 h-4 text-slate-500" />
                        {locale === 'en' ? 'Category' : 'Categoría'}:{' '}
                        <span className="text-white">{config.label}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <User className="w-4 h-4 text-slate-500" />
                        {locale === 'en' ? 'Created by' : 'Creado por'}:{' '}
                        <span className="text-white">{creatorName}</span>
                      </span>
                    </div>

                    {market.verification_sources?.length > 0 && (
                      <div>
                        <h4 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                          {locale === 'en' ? 'Verification sources' : 'Fuentes de verificación'}
                        </h4>
                        <ul className="space-y-1.5">
                          {market.verification_sources.map((src, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm">
                              <ExternalLink className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span className="text-white">{src}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {market.tags?.length > 0 && (
                      <div>
                        <h4 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                          {locale === 'en' ? 'Tags' : 'Etiquetas'}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {market.tags.map((tag, i) => (
                            <span
                              key={i}
                              className="px-2 py-1 bg-gray-700 rounded text-xs text-slate-300"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Agent Insights — only show when we have content */}
          {agentContent.length > 0 && (
            <div className="bg-cc-card border border-cc-border rounded-xl p-6">
              <h3 className="font-semibold text-white mb-4">Análisis de agentes</h3>
              <div className="space-y-4">
                {agentContent.slice(0, 5).map((ac) => (
                  <AgentInsightCard key={ac.id} content={ac} />
                ))}
              </div>
            </div>
          )}

          {/* Discussion */}
          <MarketDiscussion marketId={market.id} />

          {/* Recent Predictions */}
          <RecentPredictions marketId={market.id} isPulse={isPulseMarket} />
        </div>

        {/* Right Column — VotePanel first on mobile for easier voting UX */}
        <div className="lg:sticky lg:top-6 lg:self-start space-y-6 order-1 lg:order-2">
          <VotePanel
            market={market as PredictionMarket & { market_type?: string; total_votes?: number }}
            outcomes={outcomes}
            myVote={myVote}
            onVoteSuccess={handleTradeSuccess}
            isAuthenticated={isAuthenticated}
            guestId={guestId}
            guestVoteRecord={guestVoteRecord}
            onAnonymousVoteSuccess={handleAnonymousVoteSuccess}
            relatedMarkets={relatedMarkets}
          />
          <div className="bg-cc-card border border-cc-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Market Info
              </h3>
              <ShareButton marketId={market.id} title={getMarketText(market, 'title', locale)} sponsorName={(market as { sponsor_name?: string }).sponsor_name} compact />
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Resolution date</span>
                <span className="text-white">{formatDate(market.resolution_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">
                  {locale === 'en' ? 'Engagement' : 'Participación'}
                </span>
                <span className="text-white">{engagementCount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">
                  {locale === 'en' ? 'Registered voters' : 'Votantes registrados'}
                </span>
                <span className="text-white">{registeredVoteCount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Category</span>
                <span className="text-white">{config.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Conscious Fund</span>
                <span className="text-emerald-400">
                  {typeof market.conscious_fund_percentage === 'number' &&
                  Number.isFinite(market.conscious_fund_percentage)
                    ? `${Number(market.conscious_fund_percentage)}%`
                    : '—'}
                </span>
              </div>
            </div>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
            <h3 className="font-semibold text-emerald-400 mb-3 flex items-center gap-2">
              <Heart className="w-4 h-4" />
              Conscious Impact
            </h3>
            <p className="text-white text-sm mb-2">
              Sponsor-funded impact for {config.label.toLowerCase()}
            </p>
            <UserContribution marketId={market.id} isPulse={isPulseMarket} />
          </div>
        </div>
      </div>

      <CelebrationModal
        isOpen={celebration.open}
        type="prediction_trade"
        title="Nice!"
        message={
          celebration.guest
            ? ''
            : celebration.xpGained
              ? `You earned ${celebration.xpGained} XP`
              : celebrationRecordedMessage(loc, isPulseMarket)
        }
        xpGained={celebration.guest ? undefined : celebration.xpGained}
        guestVote={celebration.guest === true}
        guestMessage={celebrationRecordedMessage(loc, isPulseMarket)}
        isPulseMarket={isPulseMarket}
        sharePath={`/predictions/markets/${market.id}`}
        shareTitle={getMarketText(market, 'title', locale)}
        shareSponsorName={(market as { sponsor_name?: string }).sponsor_name}
        shareCardMarketId={market.id}
        onClose={handleCelebrationClose}
      />

      {guestVoteRecord && guestId && (
        <GuestRegistrationPrompt
          open={registerPromptOpen}
          marketId={market.id}
          outcomeId={guestVoteRecord.outcomeId}
          confidence={guestVoteRecord.confidence}
          voteYesNo={guestVoteRecord.voteYesNo}
          guestId={guestId}
          onDismiss={() => setRegisterPromptOpen(false)}
        />
      )}
    </div>
  )
}

function AgentInsightCard({ content }: { content: AgentContent }) {
  const [expanded, setExpanded] = useState(false)
  const Icon = AGENT_ICONS[content.agent_type] || Newspaper
  const bodyLines = content.body.split('\n').filter(Boolean)
  const truncated = bodyLines.slice(0, 3).join('\n')
  const hasMore = bodyLines.length > 3 || content.body.length > (truncated.length + 20)

  return (
    <div className="border border-cc-border rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-white text-sm">{content.title}</p>
          <p className={`text-slate-400 text-sm mt-1 whitespace-pre-wrap ${!expanded ? 'line-clamp-3' : ''}`}>
            {expanded ? content.body : truncated}
          </p>
          {hasMore && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-2 inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-xs font-medium"
            >
              {expanded ? 'Ver menos' : 'Leer más'}
              <ChevronRight className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`} />
            </button>
          )}
          <p className="text-slate-500 text-xs mt-2">{formatRelativeTime(content.created_at)}</p>
        </div>
      </div>
    </div>
  )
}

type PredictionEntry = { user_name: string; outcome_label: string; confidence: number; created_at: string }

function RecentPredictions({ marketId, isPulse }: { marketId: string; isPulse: boolean }) {
  const locale = useLocale()
  const loc = locale === 'en' ? 'en' : 'es'
  const [predictions, setPredictions] = useState<PredictionEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPredictions = async () => {
      try {
        const res = await fetch(`/api/predictions/markets/${marketId}/votes`)
        const data = await res.json()
        if (data.predictions) setPredictions(data.predictions)
      } catch {
        setPredictions([])
      } finally {
        setLoading(false)
      }
    }
    fetchPredictions()
    const interval = setInterval(fetchPredictions, 30000)
    return () => clearInterval(interval)
  }, [marketId])

  return (
    <div className="bg-cc-card border border-cc-border rounded-xl p-6">
      <h3 className="font-semibold text-white mb-4">{recentActivityHeading(loc, isPulse)}</h3>
      {loading ? (
        <p className="text-slate-400 text-sm">Loading...</p>
      ) : predictions.length === 0 ? (
        <p className="text-slate-400 text-sm">{recentActivityEmpty(loc, isPulse)}</p>
      ) : (
        <div className="space-y-2">
          {predictions.slice(0, 10).map((p, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2 border-b border-cc-border last:border-0"
            >
              <div>
                <span className="text-slate-300 text-sm font-medium">{p.user_name}</span>
                <span className="text-slate-500 text-sm"> predicted </span>
                <span className="text-emerald-400 text-sm font-medium">{p.outcome_label}</span>
                <span className="text-slate-500 text-sm"> (confidence {p.confidence}/10)</span>
              </div>
              <span className="text-slate-500 text-xs">{formatRelativeTime(p.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

type CommentEntry = { id: string; user_id: string; content: string; created_at: string; username: string }

function MarketDiscussion({ marketId }: { marketId: string }) {
  const [comments, setComments] = useState<CommentEntry[]>([])
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/predictions/markets/${marketId}/comments`)
      const data = await res.json()
      setComments(data.comments ?? [])
    } catch {
      setComments([])
    }
  }, [marketId])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/predictions/markets/${marketId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      })
      const data = await res.json()
      if (res.ok && data.comment) {
        setComments((prev) => [...prev, data.comment])
        setContent('')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-cc-card border border-cc-border rounded-xl p-6">
      <h3 className="font-semibold text-white mb-4">Discussion</h3>
      <form onSubmit={handleSubmit} className="mb-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a comment..."
          rows={3}
          className="mb-2 w-full resize-none rounded-lg border border-cc-border bg-cc-card px-4 py-3 text-white placeholder:text-cc-text-muted focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
        />
        <button
          type="submit"
          disabled={!content.trim() || submitting}
          className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Posting...' : 'Post comment'}
        </button>
      </form>
      <div className="space-y-3">
        {comments.length === 0 ? (
          <p className="text-slate-400 text-sm py-2">💬 Sé el primero en comentar</p>
        ) : (
          comments.map((c) => (
            <div
              key={c.id}
              className="py-3 border-b border-cc-border last:border-0"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-white text-sm">{c.username}</span>
                <span className="text-slate-500 text-xs">{formatRelativeTime(c.created_at)}</span>
              </div>
              <p className="text-slate-300 text-sm whitespace-pre-wrap">{c.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function UserContribution({ marketId, isPulse }: { marketId: string; isPulse: boolean }) {
  const locale = useLocale()
  const loc = locale === 'en' ? 'en' : 'es'
  const [contribution, setContribution] = useState<number | null>(null)

  useEffect(() => {
    fetch(`/api/predictions/markets/${marketId}/user-stats`)
      .then((r) => r.json())
      .then((d) => setContribution(d.userContribution ?? 0))
      .catch(() => setContribution(0))
  }, [marketId])

  if (contribution === null) return <p className="text-slate-400 text-sm">Loading...</p>
  return <p className="text-emerald-300 text-sm">{userContributionLine(loc, isPulse)}</p>
}
