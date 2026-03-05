'use client'

import { useState, useEffect } from 'react'
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
} from 'lucide-react'
import { VotePanel } from '../../components/VotePanel'
import { CelebrationModal } from '@/components/gamification/CelebrationModal'
import { toDisplayPercent } from '@/lib/probability-utils'
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
  government: { label: 'Government', icon: Building2, bg: 'bg-red-500/20', text: 'text-red-400' },
  corporate: { label: 'Corporate', icon: Briefcase, bg: 'bg-purple-500/20', text: 'text-purple-400' },
  community: { label: 'Community', icon: Users, bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  cause: { label: 'Cause', icon: Heart, bg: 'bg-amber-500/20', text: 'text-amber-400' },
  world_cup: { label: 'World Cup', icon: Trophy, bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  sustainability: { label: 'Sustainability', icon: Leaf, bg: 'bg-green-500/20', text: 'text-green-400' },
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
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

interface Props {
  market: PredictionMarket
  creatorName: string
  history: Array<{ probability: number; volume_24h: number; trade_count: number; recorded_at: string }>
  agentContent: AgentContent[]
  sentiment: SentimentScore[]
  trades: TradeAnon[]
  tradeCount: number
  totalConsciousFromMarket: number
  resolutionEvidence?: { evidence_url?: string; admin_notes?: string }
  outcomes?: Outcome[]
  myVote?: MyVote
}

type TimeRange = '7d' | '30d' | 'all'

export function MarketDetailClient({
  market,
  creatorName,
  history,
  agentContent,
  sentiment,
  trades,
  tradeCount,
  totalConsciousFromMarket,
  resolutionEvidence = {},
  outcomes = [],
  myVote = null,
}: Props) {
  const [researchOpen, setResearchOpen] = useState(false)
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')
  const [celebration, setCelebration] = useState<{
    open: boolean
    xpGained?: number
  }>({ open: false })

  const config = CATEGORY_CONFIG[market.category] || CATEGORY_CONFIG.world
  const Icon = config.icon
  const prob = toDisplayPercent(Number(market.current_probability))
  const isMultiOutcome = (market as { market_type?: string }).market_type === 'multi' && outcomes.length > 2
  const leadingOutcome = outcomes.length > 0
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

  const handleTradeSuccess = (xpGained?: number) => {
    setCelebration({ open: true, xpGained })
  }

  const isResolved = market.status === 'resolved'
  const resolutionLabel = (market as { resolution?: string }).resolution ?? (market.resolved_outcome ? 'YES' : 'NO')
  const resolvedDate = market.resolved_at ? formatDate(market.resolved_at) : ''

  return (
    <div className="space-y-6 pb-8">
      <Link
        href="/predictions"
        className="text-sm text-slate-400 hover:text-emerald-400 transition-colors inline-flex items-center gap-1"
      >
        ← Back to markets
      </Link>

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
            {tradeCount} prediction{tradeCount !== 1 ? 's' : ''} cast
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[65%_35%] gap-8">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Market Header */}
          <div>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text} mb-3`}
            >
              <Icon className="w-3.5 h-3.5" />
              {config.label}
            </span>
            <h1 className="text-2xl font-bold text-white mb-2">{market.title}</h1>
            <p className="text-slate-400 text-sm">
              Created by {creatorName} on {formatDate(market.created_at)}
            </p>
            <span
              className={`inline-block mt-2 px-2.5 py-1 rounded text-xs font-medium ${
                market.status === 'resolved'
                  ? 'bg-slate-600 text-slate-300'
                  : 'bg-emerald-500/20 text-emerald-400'
              }`}
            >
              {market.status}
            </span>
          </div>

          {/* Sponsor Banner */}
          {(market as { sponsor_name?: string }).sponsor_name && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                {(market as { sponsor_logo_url?: string }).sponsor_logo_url ? (
                  <img
                    src={(market as { sponsor_logo_url?: string }).sponsor_logo_url}
                    alt={(market as { sponsor_name?: string }).sponsor_name || ''}
                    className="w-12 h-12 object-contain rounded shrink-0"
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
                    This market is made possible by {(market as { sponsor_name?: string }).sponsor_name}. 15% of this
                    sponsorship funds the Conscious Fund.
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

          {/* Probability Display */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-slate-400 text-sm">Current probability</p>
                <p className="text-4xl font-bold text-white">
                  {isMultiOutcome && leadingOutcome
                    ? `${leadingOutcome.label} ${Math.round(toDisplayPercent(leadingOutcome.probability || 0))}%`
                    : `${Math.round(prob)}% YES`}
                </p>
              </div>
              <div
                className="relative h-24 w-24 rounded-full flex items-center justify-center"
                style={{
                  background: `conic-gradient(#10b981 0% ${prob}%, #334155 ${prob}% 100%)`,
                }}
              >
                <span className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center text-2xl font-bold text-white">
                  {Math.round(prob)}%
                </span>
              </div>
            </div>
            <div className="h-3 bg-slate-800 rounded-full overflow-hidden flex mb-6">
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

            {historyChartData.length > 0 && (
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
                            : 'bg-slate-800 text-slate-400 hover:text-white'
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
                            <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl">
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
                <p className="text-slate-400 text-sm mt-3">Vote activity</p>
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

          {/* Sentiment Gauge - between probability chart and research */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="font-semibold text-white mb-3">
              Sentimiento: {sentiment.length > 0 ? getSentimentLabel(latestSentiment) : '—'}
            </h3>
            {sentiment.length > 0 ? (
              <>
                <div className="relative h-4 bg-gradient-to-r from-red-500 via-yellow-500 to-emerald-500 rounded-full overflow-visible mb-2">
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-6 bg-white border-2 border-slate-800 rounded-sm shadow-md transition-all z-10"
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
              </>
            ) : (
              <p className="text-slate-500 text-sm">No hay datos de sentimiento aún</p>
            )}
          </div>

          {/* Research Center */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <button
              onClick={() => setResearchOpen(!researchOpen)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-800/50 transition-colors"
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
                  className="border-t border-slate-800"
                >
                  <div className="p-4 space-y-4">
                    <div>
                      <p className="text-slate-400 text-sm font-medium mb-1">Description</p>
                      <p className="text-white text-sm">{market.description}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-sm font-medium mb-1">Resolution criteria</p>
                      <p className="text-white text-sm">{market.resolution_criteria}</p>
                    </div>
                    {market.verification_sources?.length > 0 && (
                      <div>
                        <p className="text-slate-400 text-sm font-medium mb-1">Verification sources</p>
                        <ul className="space-y-1">
                          {market.verification_sources.map((src, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm">
                              <ExternalLink className="w-4 h-4 text-emerald-400" />
                              <span className="text-white">{src}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {market.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {market.tags.map((tag, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Agent Insights */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="font-semibold text-white mb-4">Análisis de agentes</h3>
            {agentContent.length === 0 ? (
              <p className="text-slate-500 text-sm">No hay análisis disponible aún</p>
            ) : (
              <div className="space-y-4">
                {agentContent.slice(0, 5).map((ac) => (
                  <AgentInsightCard key={ac.id} content={ac} />
                ))}
              </div>
            )}
          </div>

          {/* Activity Feed - with polling */}
          <ActivityFeed marketId={market.id} initialTrades={trades} />
        </div>

        {/* Right Column */}
        <div className="lg:sticky lg:top-6 lg:self-start space-y-6">
          <VotePanel
            market={market as PredictionMarket & { market_type?: string; total_votes?: number }}
            outcomes={outcomes}
            myVote={myVote}
            onVoteSuccess={handleTradeSuccess}
          />
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Market Info
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Resolution date</span>
                <span className="text-white">{formatDate(market.resolution_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Predictions</span>
                <span className="text-white">{tradeCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Category</span>
                <span className="text-white">{config.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Conscious Fund</span>
                <span className="text-emerald-400">{market.conscious_fund_percentage}%</span>
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
            <UserContribution marketId={market.id} />
          </div>
        </div>
      </div>

      <CelebrationModal
        isOpen={celebration.open}
        type="prediction_trade"
        title="Prediction recorded!"
        message="Your prediction has been recorded."
        xpGained={celebration.xpGained}
        onClose={() => setCelebration({ open: false })}
      />
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
    <div className="border border-slate-800 rounded-lg p-4">
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

function ActivityFeed({ marketId, initialTrades }: { marketId: string; initialTrades: TradeAnon[] }) {
  const [trades, setTrades] = useState(initialTrades)

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const res = await fetch(`/api/predictions/markets/${marketId}/trades`)
        const data = await res.json()
        if (data.trades) setTrades(data.trades)
      } catch {
        // keep current
      }
    }
    const interval = setInterval(fetchTrades, 30000)
    fetchTrades()
    return () => clearInterval(interval)
  }, [marketId])

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <h3 className="font-semibold text-white mb-4">Actividad reciente</h3>
      {trades.length === 0 ? (
        <p className="text-slate-400 text-sm">No activity yet</p>
      ) : (
        <div className="space-y-2">
          {trades.slice(0, 10).map((t, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0"
            >
              <span className="text-slate-300 text-sm">
                Someone predicted {t.side.toUpperCase()} — {formatRelativeTime(t.created_at)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function UserContribution({ marketId }: { marketId: string }) {
  const [contribution, setContribution] = useState<number | null>(null)

  useEffect(() => {
    fetch(`/api/predictions/markets/${marketId}/user-stats`)
      .then((r) => r.json())
      .then((d) => setContribution(d.userContribution ?? 0))
      .catch(() => setContribution(0))
  }, [marketId])

  if (contribution === null) return <p className="text-slate-400 text-sm">Loading...</p>
  return (
    <p className="text-emerald-300 text-sm">
      Your predictions contribute to collective intelligence
    </p>
  )
}
