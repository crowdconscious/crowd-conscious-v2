'use client'

import Link from 'next/link'
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Sparkles,
  Vote,
  Bot,
} from 'lucide-react'
import ShareButton from '@/components/ShareButton'
import { toDisplayPercent } from '@/lib/probability-utils'
import { getMarketText } from '@/lib/i18n/market-translations'
import { relativeTime, stripMarkdown } from '@/lib/utils'
import type { Database } from '@/types/database'

type PredictionMarket = Database['public']['Tables']['prediction_markets']['Row']
type AgentContent = Database['public']['Tables']['agent_content']['Row']

type MoverMarket = PredictionMarket & { oldProb: number; newProb: number; delta: number }

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

function formatCurrency(num: number): string {
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`
  return `$${num.toFixed(2)}`
}

export interface DashboardIntelligenceColumnProps {
  locale: string
  agentContent: AgentContent[]
  biggestMovers: MoverMarket[]
  newMarkets: PredictionMarket[]
  fundBalance: number
  userImpactXp: number
}

export function DashboardIntelligenceColumn({
  locale,
  agentContent,
  biggestMovers,
  newMarkets,
  fundBalance,
  userImpactXp,
}: DashboardIntelligenceColumnProps) {
  return (
    <div className="space-y-5">
      {agentContent && agentContent.length > 0 && (
        <div>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
            <Bot className="h-5 w-5 text-violet-400" />
            AI Pulse
          </h2>
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
                agentIcons[digestType as string] ?? agentIcons[ac.agent_type] ?? '📋'

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
        </div>
      )}

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
                  <p
                    className="line-clamp-2 text-sm font-medium text-white"
                    title={getMarketText(m, 'title', locale)}
                  >
                    {getMarketText(m, 'title', locale)}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs text-slate-500">{m.oldProb.toFixed(0)}%</span>
                    <ArrowRight className="h-3 w-3 text-slate-500" />
                    <span className="text-xs font-medium text-white">{m.newProb.toFixed(0)}%</span>
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
                  <p
                    className="line-clamp-2 text-sm font-medium text-white"
                    title={getMarketText(m, 'title', locale)}
                  >
                    {getMarketText(m, 'title', locale)}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {Math.round(toDisplayPercent(Number(m.current_probability)))}% probability
                  </p>
                </Link>
                <div onClick={(e) => e.stopPropagation()}>
                  <ShareButton marketId={m.id} title={getMarketText(m, 'title', locale)} compact />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[14px] border border-white/[0.07] bg-white/[0.03] px-5 py-4">
        <div className="flex items-center gap-6">
          <div>
            <p className="text-xs text-slate-400">Fund Balance</p>
            <p className="text-lg font-bold text-emerald-400">{formatCurrency(fundBalance)}</p>
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
  )
}
