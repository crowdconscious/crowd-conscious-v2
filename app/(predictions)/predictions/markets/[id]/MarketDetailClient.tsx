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
  ChevronDown,
  ChevronUp,
  ExternalLink,
  TrendingUp,
  Wallet,
  Calendar,
  BarChart3,
} from 'lucide-react'
import { TradePanel } from '../../components/TradePanel'
import { CelebrationModal } from '@/components/gamification/CelebrationModal'
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
}

function formatVolume(vol: number): string {
  if (vol >= 1_000_000) return `$${(vol / 1_000_000).toFixed(1)}M`
  if (vol >= 1_000) return `$${(vol / 1_000).toFixed(1)}K`
  return `$${vol.toFixed(0)}`
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

interface Props {
  market: PredictionMarket
  creatorName: string
  history: Array<{ probability: number; volume_24h: number; trade_count: number; recorded_at: string }>
  agentContent: AgentContent[]
  sentiment: SentimentScore[]
  trades: TradeAnon[]
  tradeCount: number
  totalConsciousFromMarket: number
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
}: Props) {
  const [researchOpen, setResearchOpen] = useState(false)
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')
  const [celebration, setCelebration] = useState<{
    open: boolean
    xpGained?: number
  }>({ open: false })

  const config = CATEGORY_CONFIG[market.category] || CATEGORY_CONFIG.world
  const Icon = config.icon
  const prob = Number(market.current_probability)
  const volume = Number(market.total_volume)

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
    probability: Number(h.probability),
    volume: Number(h.volume_24h),
  }))

  const sentimentChartData = sentiment.map((s) => ({
    date: new Date(s.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    score: Number(s.score),
  }))

  const latestSentiment = sentiment[0] ? Number(sentiment[0].score) : 0
  const latestAgentUpdate = agentContent[0]?.created_at

  const handleTradeSuccess = (xpGained?: number) => {
    setCelebration({ open: true, xpGained })
  }

  return (
    <div className="space-y-6 pb-8">
      <Link
        href="/predictions"
        className="text-sm text-slate-400 hover:text-emerald-400 transition-colors inline-flex items-center gap-1"
      >
        ← Back to markets
      </Link>

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

          {/* Probability Display */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-slate-400 text-sm">Current probability</p>
                <p className="text-4xl font-bold text-white">
                  {prob.toFixed(0)}% YES <span className="text-xl font-normal text-slate-400">(${((prob / 100) * 10).toFixed(2)}/share)</span>
                </p>
              </div>
              <div
                className="relative h-24 w-24 rounded-full flex items-center justify-center"
                style={{
                  background: `conic-gradient(#10b981 0% ${prob}%, #334155 ${prob}% 100%)`,
                }}
              >
                <span className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center text-2xl font-bold text-white">
                  {prob}%
                </span>
              </div>
            </div>
            <div className="h-3 bg-slate-800 rounded-full overflow-hidden flex mb-6">
              <div
                className="bg-emerald-500 h-full transition-all"
                style={{ width: `${prob}%` }}
              />
              <div
                className="bg-red-500/60 h-full transition-all"
                style={{ width: `${100 - prob}%` }}
              />
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
                              <p className="text-emerald-400 font-semibold">{Number(p.probability).toFixed(1)}% YES</p>
                              <p className="text-slate-400 text-xs">Volume (24h): ${Number(p.volume).toFixed(0)}</p>
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
                <p className="text-slate-400 text-sm mt-3">Volume (24h)</p>
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

          {/* AI Insights */}
          {agentContent.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="font-semibold text-white mb-3">AI Insights</h3>
              <p className="text-slate-400 text-xs mb-4">
                Last updated: {latestAgentUpdate ? formatDate(latestAgentUpdate) : '—'}
              </p>
              <div className="space-y-4">
                {agentContent.map((ac) => (
                  <div key={ac.id} className="border-l-2 border-emerald-500/50 pl-4">
                    <p className="text-emerald-400 text-sm font-medium">{ac.title}</p>
                    <p className="text-slate-300 text-sm mt-1">{ac.body}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sentiment Indicator */}
          {sentiment.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="font-semibold text-white mb-3">Sentiment</h3>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1">
                  <div className="h-3 bg-gradient-to-r from-red-500 via-slate-500 to-emerald-500 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-slate-900 w-2 border-2 border-white rounded-full transition-all"
                      style={{
                        marginLeft: `${((latestSentiment + 100) / 200) * 100}%`,
                        transform: 'translateX(-50%)',
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>-100</span>
                    <span className="text-white font-medium">{latestSentiment}</span>
                    <span>+100</span>
                  </div>
                </div>
              </div>
              {sentimentChartData.length > 1 && (
                <div className="h-24">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sentimentChartData}>
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="#a855f7"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Activity Feed */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="font-semibold text-white mb-4">Recent Activity</h3>
            {trades.length === 0 ? (
              <p className="text-slate-400 text-sm">No trades yet</p>
            ) : (
              <div className="space-y-2">
                {trades.map((t, i) => {
                  const pricePerShare = t.price_per_share_mxn != null ? Number(t.price_per_share_mxn) : Number(t.price) * 10
                  const shares = t.shares != null ? Number(t.shares) : (pricePerShare > 0 ? Number(t.amount) / pricePerShare : 0)
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0"
                    >
                      <span className="text-slate-300 text-sm">
                        Someone bought {shares.toFixed(1)} {t.side.toUpperCase()} shares at ${pricePerShare.toFixed(2)}
                      </span>
                      <span className="text-slate-500 text-xs">
                        {formatDate(t.created_at)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:sticky lg:top-6 lg:self-start space-y-6">
          <TradePanel
            market={market}
            onTradeSuccess={handleTradeSuccess}
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
                <span className="text-slate-400">Total volume</span>
                <span className="text-white">{formatVolume(volume)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Traders</span>
                <span className="text-white">{tradeCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Fee rate</span>
                <span className="text-white">{market.fee_percentage}%</span>
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
              This market has funded {formatVolume(totalConsciousFromMarket)} for {config.label.toLowerCase()}
            </p>
            <UserContribution marketId={market.id} />
          </div>
        </div>
      </div>

      <CelebrationModal
        isOpen={celebration.open}
        type="prediction_trade"
        title="Trade successful!"
        message="Your prediction has been recorded."
        xpGained={celebration.xpGained}
        onClose={() => setCelebration({ open: false })}
      />
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
      Your trades have contributed {formatVolume(contribution)}
    </p>
  )
}
