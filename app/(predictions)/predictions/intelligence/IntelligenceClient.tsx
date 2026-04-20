'use client'

import { useMemo, useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  RadarController,
} from 'chart.js'
import {
  Line,
  Bar,
  Doughnut,
  Radar,
} from 'react-chartjs-2'
import {
  BarChart3,
  Download,
  Shield,
  TrendingUp,
  TrendingDown,
  Users,
  Sparkles,
  HeartHandshake,
  Target,
  Trophy,
  ArrowRight,
} from 'lucide-react'
import { METRIC_LABELS } from '@/lib/i18n/metrics'
import MetricTooltip from '@/components/ui/MetricTooltip'
import type {
  IntelligenceDashboardData,
  MarketRowCsv,
  PeriodDelta,
  VoteChangeLeader,
} from '@/lib/intelligence-data'

ChartJS.register(
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  RadarController,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

const CARD = 'rounded-xl border border-white/5 bg-[#1a2029]'
const ACCENT = '#10b981'
const BORDER = 'rgba(255,255,255,0.06)'
const TEXT = '#e8e6df'
const MUTED = '#6b7280'

const chartOptsBase = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: { color: TEXT, font: { size: 11 } },
    },
  },
  scales: {
    x: {
      ticks: { color: MUTED, font: { size: 10 } },
      grid: { color: 'rgba(255,255,255,0.04)' },
    },
    y: {
      ticks: { color: MUTED, font: { size: 10 } },
      grid: { color: 'rgba(255,255,255,0.04)' },
    },
  },
}

function downloadCSV(rows: MarketRowCsv[]) {
  const headers = [
    'Market',
    'Category',
    'Registered voters',
    'Engagement',
    'YES %',
    'Status',
    'Resolution Date',
  ]
  const lines = [
    headers.join(','),
    ...rows.map((m) =>
      [
        `"${(m.title || '').replace(/"/g, '""')}"`,
        m.category,
        m.total_votes,
        m.engagement_count,
        `${Math.round(m.yes_probability * 100)}%`,
        m.status,
        m.resolution_date ?? '',
      ].join(',')
    ),
  ]
  const csv = lines.join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `crowd-conscious-data-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Headlines are surfaced to admins/sponsors. We hide low-sample claims (n < MIN_N)
 * because a "100% community consensus" with 21 voters reads as marketing puffery,
 * not insight — and would erode trust with sponsors looking at the same dashboard.
 */
const MIN_HEADLINE_VOTES = 25
const MIN_CONSENSUS_VOTES = 50

function generateHeadlines(data: IntelligenceDashboardData) {
  const headlines: { type: string; color: string; text: string; meta: string }[] = []

  const eligible = data.topMarkets.filter((m) => m.total_votes >= MIN_HEADLINE_VOTES)

  const consensus = [...eligible]
    .filter((m) => m.total_votes >= MIN_CONSENSUS_VOTES)
    .sort(
      (a, b) => Math.abs(b.yes_probability - 0.5) - Math.abs(a.yes_probability - 0.5)
    )[0]
  if (consensus) {
    headlines.push({
      type: 'Mayor consenso',
      color: 'emerald',
      text: `${Math.round(consensus.yes_probability * 100)}% de la comunidad se inclina hacia "${truncate(consensus.title, 90)}".`,
      meta: `Basado en ${consensus.total_votes} votantes registrados`,
    })
  }

  const contested = [...eligible].sort(
    (a, b) => Math.abs(a.yes_probability - 0.5) - Math.abs(b.yes_probability - 0.5)
  )[0]
  if (contested) {
    headlines.push({
      type: 'Más disputado',
      color: 'amber',
      text: `"${truncate(contested.title, 90)}" está en ${Math.round(contested.yes_probability * 100)}% YES — la comunidad sigue dividida.`,
      meta: `${contested.total_votes} votantes registrados`,
    })
  }

  if (data.deltas.votes_30d.pct_change != null) {
    const pc = data.deltas.votes_30d.pct_change
    headlines.push({
      type: 'Crecimiento (30 días)',
      color: pc >= 0 ? 'emerald' : 'amber',
      text: `${pc >= 0 ? '+' : ''}${pc}% en participaciones vs los 30 días anteriores (${data.deltas.votes_30d.current.toLocaleString()} vs ${data.deltas.votes_30d.previous.toLocaleString()}).`,
      meta: 'Periodo móvil de 30 días',
    })
  }

  if (data.impact.crowd_accuracy_pct != null && data.impact.crowd_accuracy_sample > 50) {
    headlines.push({
      type: 'Precisión colectiva',
      color: 'sky',
      text: `Cuando los mercados se resuelven, la comunidad acierta ${data.impact.crowd_accuracy_pct}% de las veces.`,
      meta: `Muestra: ${data.impact.crowd_accuracy_sample.toLocaleString()} votos resueltos de usuarios registrados`,
    })
  }

  if (headlines.length === 0) {
    headlines.push({
      type: 'Sin titulares por ahora',
      color: 'amber',
      text: `Aún no hay suficientes datos (${MIN_HEADLINE_VOTES}+ votos por mercado) para emitir titulares con confianza estadística.`,
      meta: `Total participaciones: ${data.kpis.total_engagement.toLocaleString()}`,
    })
  }

  return headlines
}

function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s
}

type TabId =
  | 'impact'
  | 'overview'
  | 'markets'
  | 'users'
  | 'sentiment'
  | 'headlines'
  | 'share'
  | 'sponsor'

const TABS: { id: TabId; label: string }[] = [
  { id: 'impact', label: 'Impact' },
  { id: 'overview', label: 'Overview' },
  { id: 'markets', label: 'Markets' },
  { id: 'users', label: 'Users' },
  { id: 'sentiment', label: 'Sentiment' },
  { id: 'headlines', label: 'Headlines' },
  { id: 'share', label: 'Share Cards' },
  { id: 'sponsor', label: 'Sponsor Report' },
]

type RangeKey = '7' | '30' | 'all'

type CronAgentRow = {
  agent: string
  lastRun: string | null
  status: string
  error: string | null
  summary: string | null
  isHealthy: boolean
}

function CronHealthStrip() {
  const [rows, setRows] = useState<CronAgentRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/cron-health', { credentials: 'include' })
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error || r.statusText)
        return data as { agents: CronAgentRow[] }
      })
      .then((data) => {
        if (!cancelled) setRows(data.agents ?? [])
      })
      .catch((e) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className={`${CARD} px-4 py-3 text-sm text-slate-500`}>System health: loading…</div>
    )
  }
  if (err) {
    return (
      <div className={`${CARD} px-4 py-3 text-sm text-amber-200/90 border-amber-500/20`}>
        System health: could not load ({err})
      </div>
    )
  }
  if (!rows?.length) return null

  return (
    <div className={`${CARD} p-4`}>
      <h3 className="text-sm font-medium text-slate-500 mb-1">System health</h3>
      <p className="text-xs text-slate-600 mb-3">
        Scheduled crons (Vercel). Green = last run succeeded within the expected window.
      </p>
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
        {rows.map((a) => (
          <li
            key={a.agent}
            className="flex items-start gap-2 rounded-lg border border-white/5 bg-black/20 px-2 py-2"
            title={a.summary || a.error || undefined}
          >
            <span
              className="mt-1 h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: a.isHealthy ? ACCENT : '#ef4444' }}
              aria-hidden
            />
            <span className="min-w-0">
              <span className="font-mono text-[11px] text-[#e8e6df]">{a.agent}</span>
              <span className="block text-slate-600">{a.status}</span>
              {a.lastRun && (
                <span className="block text-slate-500">{new Date(a.lastRun).toLocaleString()}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function IntelligenceClient({
  initialData,
  initialIncludeArchived = false,
}: {
  initialData: IntelligenceDashboardData
  initialIncludeArchived?: boolean
}) {
  const [data, setData] = useState<IntelligenceDashboardData>(initialData)
  const [showArchived, setShowArchived] = useState(initialIncludeArchived)
  const [intelLoading, setIntelLoading] = useState(false)
  const [tab, setTab] = useState<TabId>('impact')
  const [range, setRange] = useState<RangeKey>('30')

  useEffect(() => {
    setData(initialData)
    setShowArchived(initialIncludeArchived)
  }, [initialData, initialIncludeArchived])

  const onToggleArchived = useCallback(
    async (checked: boolean) => {
      setShowArchived(checked)
      setIntelLoading(true)
      try {
        const r = await fetch(
          `/api/predictions/admin/intelligence-dashboard?includeArchived=${checked ? '1' : '0'}`,
          { credentials: 'include' }
        )
        const j = (await r.json()) as IntelligenceDashboardData & { error?: string }
        if (!r.ok) throw new Error(j.error || r.statusText)
        setData(j)
      } catch {
        setData(initialData)
        setShowArchived(initialIncludeArchived)
      } finally {
        setIntelLoading(false)
      }
    },
    [initialData, initialIncludeArchived]
  )

  const filteredVotesTime = useMemo(() => {
    const s = data.votesOverTime
    if (range === 'all') return s
    const n = range === '7' ? 7 : 30
    return s.slice(-n)
  }, [data.votesOverTime, range])

  const filteredSignups = useMemo(() => {
    const s = data.signupsOverTime
    if (range === 'all') return s
    const n = range === '7' ? 7 : 30
    return s.slice(-n)
  }, [data.signupsOverTime, range])

  const yesNoDoughnut = useMemo(
    () => ({
      yes: data.voteYesNoSplit.yes_like,
      no: data.voteYesNoSplit.no_like,
      other: data.voteYesNoSplit.other,
    }),
    [data.voteYesNoSplit]
  )

  const radarSentiment = useMemo(() => {
    const labels = data.sentimentByCategory.map((s) => s.category)
    const values = data.sentimentByCategory.map((s) => Math.round(s.avg_yes_probability * 100))
    const binaryVoteRows = data.sentimentByCategory.map((s) => s.total_votes)
    return { labels, values, binaryVoteRows }
  }, [data.sentimentByCategory])

  const headlines = useMemo(() => generateHeadlines(data), [data])

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app'

  const downloadCard = useCallback(async (el: HTMLDivElement | null, name: string) => {
    if (!el) return
    const mod = await import('html2canvas')
    const canvas = await mod.default(el, { backgroundColor: '#1a2029', scale: 2 })
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = `cc-share-${name.slice(0, 20).replace(/\s+/g, '-')}.png`
    a.click()
  }, [])

  const sponsorBody = useMemo(() => {
    const i = data.impact
    const fundFmt = (n: number) => `$${Math.round(n).toLocaleString()} MXN`
    const lines = [
      `Crowd Conscious — Impact Snapshot`,
      `Generated: ${new Date().toISOString().slice(0, 10)}`,
      ``,
      `REACH`,
      `- People reached: ${i.unique_participants.toLocaleString()} (${data.kpis.total_users.toLocaleString()} registered + ${(i.unique_participants - data.kpis.total_users).toLocaleString()} anonymous)`,
      `- Predictions cast (lifetime): ${i.predictions_lifetime.toLocaleString()}`,
      `- Predictions (last 30d): ${data.deltas.votes_30d.current.toLocaleString()}${data.deltas.votes_30d.pct_change != null ? ` (${data.deltas.votes_30d.pct_change >= 0 ? '+' : ''}${data.deltas.votes_30d.pct_change}% vs prev 30d)` : ''}`,
      `- New signups (last 30d): ${data.deltas.signups_30d.current.toLocaleString()}${data.deltas.signups_30d.pct_change != null ? ` (${data.deltas.signups_30d.pct_change >= 0 ? '+' : ''}${data.deltas.signups_30d.pct_change}%)` : ''}`,
      ``,
      `IMPACT`,
      `- Conscious Fund raised: ${fundFmt(i.fund_collected)}`,
      `- Conscious Fund deployed: ${fundFmt(i.fund_disbursed)}`,
      `- Currently available: ${fundFmt(i.fund_balance)}`,
      `- Active causes supported: ${i.causes_supported}`,
      ``,
      `QUALITY`,
      `- Markets resolved: ${i.markets_resolved_total}`,
      `- Crowd accuracy: ${i.crowd_accuracy_pct != null ? `${i.crowd_accuracy_pct}% (n=${i.crowd_accuracy_sample.toLocaleString()})` : 'awaiting first resolutions'}`,
      `- Avg confidence: ${data.kpis.avg_confidence != null ? data.kpis.avg_confidence.toFixed(2) : '—'} / 10`,
      `- Live events hosted: ${i.live_events_total} (${i.live_events_completed} completed)`,
      ``,
    ]
    if (i.top_topics_30d.length > 0) {
      lines.push(`TOP TOPICS (30d)`)
      for (const t of i.top_topics_30d) {
        lines.push(`- ${t.category.replace(/_/g, ' ')}: ${t.vote_count.toLocaleString()} votes`)
      }
      lines.push(``)
    }
    if (i.top_causes_this_cycle.length > 0) {
      lines.push(`LEADING CAUSES (cycle ${new Date().toISOString().slice(0, 7)})`)
      for (const c of i.top_causes_this_cycle) {
        lines.push(`- ${c.name}${c.organization ? ` · ${c.organization}` : ''}: ${c.vote_count} votes`)
      }
      lines.push(``)
    }
    return lines.join('\n')
  }, [data])

  return (
    <div className="space-y-6 text-[#e8e6df] max-w-[1600px] mx-auto">
      <Link
        href="/predictions"
        className="inline-flex text-sm text-slate-500 hover:text-emerald-400 transition-colors"
      >
        ← Back to Dashboard
      </Link>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-white/5 pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <BarChart3 className="w-6 h-6 text-emerald-500" aria-hidden />
            <h1 className="text-xl font-medium text-[#e8e6df]">Intelligence Hub</h1>
            <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-emerald-400">
              <Shield className="w-3 h-3" />
              Admin
            </span>
          </div>
          <p className="text-sm text-slate-500">
            People reached, predictions cast, fund deployed — the platform&apos;s real-world signal.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-gray-400 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => onToggleArchived(e.target.checked)}
              disabled={intelLoading}
              className="accent-emerald-500"
            />
            Show archived
          </label>
          {showArchived && (
            <span className="text-gray-500 text-xs">
              ({data.allMarkets.filter((m) => m.archived_at).length} archived)
            </span>
          )}
          {intelLoading && <span className="text-xs text-slate-500">Updating…</span>}
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as RangeKey)}
            className="rounded-lg border border-white/10 bg-[#1a2029] px-3 py-2 text-sm text-[#e8e6df] focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="all">All time (up to 1y)</option>
          </select>
          <button
            type="button"
            onClick={() => downloadCSV(data.allMarkets)}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </header>

      {!data.loadedWithServiceRole && (
        <div className={`${CARD} px-4 py-3 text-amber-200/90 text-sm border-amber-500/20`}>
          Service role key missing — KPIs may be empty in local dev. Configure SUPABASE_SERVICE_ROLE_KEY.
        </div>
      )}
      {data.errors.length > 0 && (
        <div className={`${CARD} px-4 py-2 text-red-300/90 text-xs font-mono border-red-500/20`}>
          {data.errors.slice(0, 3).join(' · ')}
        </div>
      )}

      <SnapshotHero data={data} />

      <CronHealthStrip />

      <div className="flex flex-wrap gap-1 border-b border-white/5 pb-px">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-emerald-500/[0.08] text-emerald-400 border border-b-0 border-white/5 border-t border-x'
                : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <main className="space-y-8 min-w-0 pb-8">
          {tab === 'impact' && <ImpactTab data={data} />}

          {tab === 'overview' && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Kpi
                  label="Registered voters"
                  value={data.kpis.registered_votes}
                  hint="People who created an account and cast a vote"
                />
                <Kpi
                  label="Total engagement"
                  value={data.kpis.total_engagement}
                  delta={data.deltas.votes_30d}
                  hint="All votes (registered + anonymous)"
                />
                <Kpi
                  label="Anonymous share"
                  value={
                    data.kpis.anonymous_engagement_rate_pct != null
                      ? `${data.kpis.anonymous_engagement_rate_pct}%`
                      : '—'
                  }
                  hint="Activation funnel — anonymous votes that haven't converted yet"
                />
                <Kpi
                  label="New users"
                  value={data.kpis.total_users}
                  delta={data.deltas.signups_30d}
                />
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Kpi label="Active markets" value={data.kpis.active_markets} />
                <Kpi
                  label="Avg confidence"
                  value={data.kpis.avg_confidence != null ? data.kpis.avg_confidence.toFixed(2) : '—'}
                  hint="1–10 scale across all votes"
                />
                <Kpi
                  label="Conscious fund"
                  value={data.kpis.fund_total != null ? `$${data.kpis.fund_total.toLocaleString()}` : '—'}
                  accent
                  hint="Current balance (MXN)"
                />
                <Kpi
                  label="Orphan markets"
                  value={data.kpis.orphan_markets}
                  hint="Markets with 0 votes — content debt to address"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Kpi
                  label="Vote updates (7d)"
                  value={data.kpis.vote_changes_week}
                  delta={data.deltas.votes_7d}
                  hint="Registered users revisiting + changing their vote"
                />
              </div>
              {data.voteChangeLeaders.length > 0 && (
                <div className={`${CARD} p-5`}>
                  <h3 className="text-sm font-medium text-slate-500 mb-3">
                    Markets with the most vote-change activity (7d)
                  </h3>
                  <ul className="space-y-2 text-sm">
                    {data.voteChangeLeaders.map((m: VoteChangeLeader) => (
                      <li key={m.market_id} className="flex justify-between gap-4 text-slate-300">
                        <Link
                          href={`/predictions/markets/${m.market_id}`}
                          className="text-emerald-400/90 hover:text-emerald-300 truncate min-w-0"
                        >
                          {m.title}
                        </Link>
                        <span className="text-slate-500 tabular-nums shrink-0">{m.change_events} changes</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {data.voterSplit.some((v) => v.count > 0) && (
                <div className={`h-56 max-w-md ${CARD} p-5`}>
                  <h3 className="text-sm font-medium text-slate-500 mb-3">Registered vs anonymous</h3>
                  <Doughnut
                    data={{
                      labels: data.voterSplit.map((v) =>
                        v.voter_type === 'anonymous' ? 'Anonymous' : 'Registered'
                      ),
                      datasets: [
                        {
                          data: data.voterSplit.map((v) => v.count),
                          backgroundColor: ['#374151', '#10b981'],
                          borderColor: 'rgba(255,255,255,0.06)',
                          borderWidth: 1,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { position: 'bottom', labels: { color: TEXT, font: { size: 11 } } } },
                    }}
                  />
                </div>
              )}
              <div className="grid lg:grid-cols-2 gap-6">
                <div className={`h-72 ${CARD} p-5`}>
                  <h3 className="text-sm font-medium text-slate-500 mb-3">Votes per day</h3>
                  <Line
                    data={{
                      labels: filteredVotesTime.map((d) => d.date),
                      datasets: [
                        {
                          label: 'Votes',
                          data: filteredVotesTime.map((d) => d.count),
                          borderColor: ACCENT,
                          backgroundColor: 'rgba(16,185,129,0.15)',
                          fill: true,
                          tension: 0.25,
                          pointRadius: 2,
                          pointBackgroundColor: ACCENT,
                        },
                      ],
                    }}
                    options={{ ...chartOptsBase, plugins: { ...chartOptsBase.plugins, legend: { display: false } } }}
                  />
                </div>
                <div className={`h-72 ${CARD} p-5`}>
                  <h3 className="text-sm font-medium text-slate-500 mb-3">Votes by category</h3>
                  <Doughnut
                    data={{
                      labels: data.votesByCategory.map((c) => c.category),
                      datasets: [
                        {
                          data: data.votesByCategory.map((c) => c.vote_count),
                          backgroundColor: [
                            'rgba(16,185,129,0.8)',
                            'rgba(59,130,246,0.75)',
                            'rgba(168,85,247,0.75)',
                            'rgba(249,115,22,0.75)',
                            'rgba(236,72,153,0.75)',
                            'rgba(234,179,8,0.75)',
                          ],
                          borderColor: BORDER,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { position: 'right', labels: { color: TEXT } } },
                    }}
                  />
                </div>
              </div>
              <div className={`${CARD} overflow-hidden`}>
                <h3 className="text-sm font-medium text-slate-500 px-5 pt-5 pb-2">Top markets</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5 text-left text-[11px] font-medium uppercase tracking-wide text-slate-500">
                        <th className="px-5 py-2">Title</th>
                        <th className="px-3 py-2">Category</th>
                        <th className="px-3 py-2 text-right">Eng.</th>
                        <th className="px-3 py-2 text-right">Reg.</th>
                        <th className="px-5 py-2 text-right">YES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topMarkets.map((m) => (
                        <tr
                          key={m.id}
                          className="border-b border-white/5 transition-colors hover:bg-white/[0.02]"
                        >
                          <td className="px-5 py-2.5 max-w-[260px] truncate text-slate-300">{m.title}</td>
                          <td className="px-3 py-2.5 text-slate-400">{m.category}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{m.engagement_count}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-slate-400">{m.total_votes}</td>
                          <td className="px-5 py-2.5 text-right tabular-nums text-emerald-400/90">
                            {Math.round(m.yes_probability * 100)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {tab === 'markets' && (
            <div className="space-y-6">
              <div className={`h-80 ${CARD} p-5`}>
                <h3 className="text-sm font-medium text-slate-500 mb-3">Probability drift (top 5 markets, ~4 weeks)</h3>
                <Line
                  data={{
                    labels: mergeDriftLabels(data.driftSeries),
                    datasets: data.driftSeries.map((s, i) => ({
                      label: s.title.slice(0, 28),
                      data: alignDrift(mergeDriftLabels(data.driftSeries), s),
                      borderColor: driftColor(i),
                      tension: 0.2,
                      fill: false,
                    })),
                  }}
                  options={{
                    ...chartOptsBase,
                    interaction: { mode: 'index', intersect: false },
                  }}
                />
              </div>
              <div className={`overflow-x-auto ${CARD}`}>
                <table className="w-full text-sm min-w-[800px]">
                  <thead>
                    <tr className="border-b border-white/5 text-left text-[11px] font-medium uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-3">Market</th>
                      <th className="px-3 py-3">Category</th>
                      <th className="px-3 py-3 text-right">Engagement</th>
                      <th className="px-3 py-3 text-right">Reg.</th>
                      <th className="px-5 py-3">YES %</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-5 py-3">Resolves</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.allMarkets.map((m) => (
                      <tr
                        key={m.id}
                        className="border-b border-white/5 transition-colors hover:bg-white/[0.02]"
                      >
                        <td className="px-5 py-3 max-w-[260px] truncate text-slate-300">{m.title}</td>
                        <td className="px-3 py-3 text-slate-400">{m.category}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{m.engagement_count}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-slate-400">{m.total_votes}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-[60px] shrink-0 rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-emerald-500"
                                style={{ width: `${Math.round(m.yes_probability * 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-400 tabular-nums w-9">
                              {Math.round(m.yes_probability * 100)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <StatusBadge status={m.status} />
                        </td>
                        <td className="px-5 py-3 text-xs text-slate-500">
                          {m.resolution_date?.slice(0, 10) ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'users' && (
            <div className="grid lg:grid-cols-2 gap-6">
              <div className={`h-72 ${CARD} p-5`}>
                <h3 className="text-sm font-medium text-slate-500 mb-3">New profiles (signups) by day</h3>
                <Line
                  data={{
                    labels: filteredSignups.map((d) => d.date),
                    datasets: [
                      {
                        label: 'Signups',
                        data: filteredSignups.map((d) => d.signups),
                        borderColor: ACCENT,
                        backgroundColor: 'rgba(16,185,129,0.12)',
                        fill: true,
                      },
                    ],
                  }}
                  options={{ ...chartOptsBase, plugins: { legend: { display: false } } }}
                />
              </div>
              <div className={`h-72 ${CARD} p-5`}>
                <h3 className="text-sm font-medium text-slate-500 mb-3">XP leaderboard (top 10)</h3>
                <Bar
                  data={{
                    labels: data.leaderboard.map((_, i) => `#${i + 1}`),
                    datasets: [
                      {
                        label: 'XP',
                        data: data.leaderboard.map((l) => l.total_xp),
                        backgroundColor: 'rgba(16,185,129,0.65)',
                        borderColor: ACCENT,
                        borderWidth: 1,
                      },
                    ],
                  }}
                  options={{
                    indexAxis: 'y' as const,
                    ...chartOptsBase,
                    plugins: { legend: { display: false } },
                  }}
                />
              </div>
              <div className={`lg:col-span-2 h-64 ${CARD} p-5`}>
                <h3 className="text-sm font-medium text-slate-500 mb-3">Accuracy distribution (top 50 users by XP)</h3>
                <Bar
                  data={{
                    labels: data.accuracyBuckets.map((b) => b.label),
                    datasets: [
                      {
                        label: 'Users',
                        data: data.accuracyBuckets.map((b) => b.count),
                        backgroundColor: 'rgba(16,185,129,0.35)',
                      },
                    ],
                  }}
                  options={{ ...chartOptsBase, plugins: { legend: { display: false } } }}
                />
              </div>
              <div className={`lg:col-span-2 overflow-x-auto ${CARD}`}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-left text-[11px] font-medium uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-3">#</th>
                      <th className="px-3 py-3">Name</th>
                      <th className="px-3 py-3 text-right">XP</th>
                      <th className="px-3 py-3 text-right">Votes</th>
                      <th className="px-5 py-3 text-right">Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.leaderboard.map((l, i) => (
                      <tr
                        key={i}
                        className="border-b border-white/5 transition-colors hover:bg-white/[0.02]"
                      >
                        <td className="px-5 py-2.5 text-slate-500">{i + 1}</td>
                        <td className="px-3 py-2.5 text-slate-300">{l.display_name || 'Anonymous'}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-emerald-400/90">
                          {l.total_xp.toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{l.votes_cast}</td>
                        <td className="px-5 py-2.5 text-right tabular-nums">
                          {l.accuracy_pct != null ? `${l.accuracy_pct}%` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'sentiment' && (
            <div className="grid lg:grid-cols-2 gap-6">
              <div className={`h-96 ${CARD} p-5`}>
                <h3 className="text-sm font-medium text-slate-500 mb-1">YES % by category (binary markets)</h3>
                <p className="text-[11px] text-slate-600 mb-3">
                  Real data from <code className="text-slate-500">market_votes</code> × <code className="text-slate-500">prediction_markets</code>.
                  Only <strong className="text-slate-400">2-outcome</strong> markets — confidence-weighted; YES-like = Sí/Yes or No. Pulse / multi-outcome
                  votes are excluded here (they were inflating “optimism” via outcome probabilities). Last 250k votes by recency.
                </p>
                <Radar
                  data={{
                    labels: radarSentiment.labels,
                    datasets: [
                      {
                        label: 'Avg YES % (binary)',
                        data: radarSentiment.values,
                        backgroundColor: 'rgba(16,185,129,0.25)',
                        borderColor: ACCENT,
                        borderWidth: 2,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      r: {
                        min: 0,
                        max: 100,
                        ticks: { color: '#94a3b8', backdropColor: 'transparent' },
                        grid: { color: BORDER },
                        angleLines: { color: BORDER },
                        pointLabels: { color: TEXT, font: { size: 11 } },
                      },
                    },
                    plugins: {
                      legend: { labels: { color: TEXT } },
                      tooltip: {
                        callbacks: {
                          afterLabel: (ctx) => {
                            const n = radarSentiment.binaryVoteRows[ctx.dataIndex] ?? 0
                            return `${n} vote rows (binary markets)`
                          },
                        },
                      },
                    },
                  }}
                />
              </div>
              <div className={`h-96 ${CARD} p-5`}>
                <h3 className="text-sm font-medium text-slate-500 mb-1">YES vs NO (votes)</h3>
                <p className="text-[11px] text-slate-600 mb-3">
                  All markets: YES/NO labels, else leading outcome above 50% prob = YES-like (same as before). Compare with the radar, which is binary-only.
                </p>
                <Doughnut
                  data={{
                    labels: ['YES-like', 'NO-like', 'Other / multi'],
                    datasets: [
                      {
                        data: [yesNoDoughnut.yes, yesNoDoughnut.no, yesNoDoughnut.other],
                        backgroundColor: [
                          'rgba(16,185,129,0.85)',
                          'rgba(239,68,68,0.75)',
                          'rgba(148,163,184,0.5)',
                        ],
                        borderColor: BORDER,
                      },
                    ],
                  }}
                  options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: TEXT } } } }}
                />
              </div>
              <div className={`lg:col-span-2 h-56 ${CARD} p-5`}>
                <h3 className="text-sm font-medium text-slate-500 mb-1">Vote rows by category (all markets)</h3>
                <p className="text-[11px] text-slate-600 mb-3">
                  Where activity actually is — includes Pulse and multi-outcome. Pairs with the radar (binary YES% only).
                </p>
                <Bar
                  data={{
                    labels: data.votesByCategory.map((c) => c.category),
                    datasets: [
                      {
                        label: 'Vote rows',
                        data: data.votesByCategory.map((c) => c.vote_count),
                        backgroundColor: 'rgba(59,130,246,0.45)',
                      },
                    ],
                  }}
                  options={{ ...chartOptsBase, plugins: { legend: { display: false } } }}
                />
              </div>
              <div className={`lg:col-span-2 h-64 ${CARD} p-5`}>
                <h3 className="text-sm font-medium text-slate-500 mb-1">Confidence (1–10)</h3>
                <p className="text-[11px] text-slate-600 mb-3">
                  Histogram of confidence in market_votes (same filter as archived toggle).
                </p>
                <Bar
                  data={{
                    labels: data.confidenceDist.map((c) => String(c.confidence)),
                    datasets: [
                      {
                        label: 'Votes',
                        data: data.confidenceDist.map((c) => c.count),
                        backgroundColor: 'rgba(16,185,129,0.55)',
                      },
                    ],
                  }}
                  options={{ ...chartOptsBase, plugins: { legend: { display: false } } }}
                />
              </div>
            </div>
          )}

          {tab === 'headlines' && (
            <div className="space-y-4 max-w-3xl">
              {headlines.map((h, i) => (
                <div
                  key={i}
                  className={`rounded-xl border border-white/5 bg-[#1a2029] p-5 ${
                    h.color === 'green'
                      ? 'border-l-2 border-l-emerald-500/60'
                      : h.color === 'amber'
                        ? 'border-l-2 border-l-amber-500/60'
                        : 'border-l-2 border-l-sky-500/50'
                  }`}
                >
                  <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">{h.type}</div>
                  <p className="text-slate-200 leading-relaxed">{h.text}</p>
                  <p className="text-xs text-slate-500 mt-2">{h.meta}</p>
                </div>
              ))}
            </div>
          )}

          {tab === 'share' && (
            <div className="grid md:grid-cols-2 gap-6">
              {data.topMarkets.slice(0, 5).map((m) => (
                <div key={m.id} className="space-y-2">
                  <div
                    id={`share-card-${m.id}`}
                    className="rounded-2xl border border-white/10 overflow-hidden shadow-xl bg-[#1a2029]"
                  >
                    <div className="px-4 py-3 flex items-center justify-between border-b border-slate-800">
                      <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">{m.category}</span>
                      <span className="text-[10px] text-slate-500">Crowd Conscious</span>
                    </div>
                    <div className="p-5 space-y-4">
                      <p className="text-lg font-semibold text-white leading-snug min-h-[3.5rem]">{m.title}</p>
                      <div>
                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                          <span>YES</span>
                          <span>NO</span>
                        </div>
                        <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400"
                            style={{ width: `${Math.round(m.yes_probability * 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between mt-2 text-sm">
                          <span className="text-emerald-400 font-bold">{Math.round(m.yes_probability * 100)}% YES</span>
                          <span className="text-slate-400">{100 - Math.round(m.yes_probability * 100)}% NO</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                        <span className="text-slate-400 text-sm">
                          {m.engagement_count.toLocaleString()} participaciones
                        </span>
                        <span className="text-emerald-400 font-medium text-sm">¿Y tú?</span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{baseUrl}/predictions/markets/{m.id}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById(`share-card-${m.id}`)
                      downloadCard(el as HTMLDivElement, m.title)
                    }}
                    className="w-full py-2 rounded-lg border border-white/10 bg-[#0f1419] hover:bg-white/5 text-sm text-slate-200"
                  >
                    Download card (PNG)
                  </button>
                </div>
              ))}
            </div>
          )}

          {tab === 'sponsor' && <SponsorReportTab data={data} sponsorBody={sponsorBody} />}
      </main>
    </div>
  )
}

function Kpi({
  label,
  value,
  accent,
  delta,
  hint,
}: {
  label: string
  value: string | number
  accent?: boolean
  /** WoW/MoM delta — renders ↑/↓ + % below the value when provided. */
  delta?: PeriodDelta | null
  /** One-line subtext explaining the metric (visible to all admins, not a tooltip). */
  hint?: string
}) {
  return (
    <div className={`${CARD} p-5`}>
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div
        className={`mt-1 text-2xl font-medium ${accent ? 'text-emerald-400' : 'text-[#e8e6df]'}`}
      >
        {value}
      </div>
      {delta && <DeltaBadge delta={delta} />}
      {hint && <div className="mt-1.5 text-[11px] text-slate-600 leading-snug">{hint}</div>}
    </div>
  )
}

function DeltaBadge({ delta }: { delta: PeriodDelta }) {
  if (delta.pct_change == null) {
    return (
      <div className="mt-1 text-[11px] text-slate-600">
        {delta.current.toLocaleString()} esta semana · sin comparativo
      </div>
    )
  }
  const up = delta.pct_change >= 0
  const Icon = up ? TrendingUp : TrendingDown
  const colorClass = up ? 'text-emerald-400' : 'text-amber-400'
  return (
    <div className={`mt-1 inline-flex items-center gap-1 text-[11px] ${colorClass}`}>
      <Icon className="h-3 w-3" aria-hidden />
      <span className="tabular-nums">
        {up ? '+' : ''}
        {delta.pct_change}%
      </span>
      <span className="text-slate-600">
        vs prev ({delta.previous.toLocaleString()} → {delta.current.toLocaleString()})
      </span>
    </div>
  )
}

/**
 * Snapshot hero — pinned above the tabs so the four metrics that matter most
 * (people reached, predictions cast, fund deployed, crowd accuracy) are always
 * the first thing an admin/sponsor sees, regardless of which tab they pick.
 */
function SnapshotHero({ data }: { data: IntelligenceDashboardData }) {
  const i = data.impact
  const fundFmt = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${Math.round(n).toLocaleString()}`
  const items: Array<{
    label: string
    value: string
    sub: string
    Icon: typeof Users
    tooltip?: string
  }> = [
    {
      label: 'People reached',
      value: i.unique_participants.toLocaleString(),
      sub: `${data.kpis.total_users.toLocaleString()} registered · ${(i.unique_participants - data.kpis.total_users).toLocaleString()} anonymous`,
      Icon: Users,
    },
    {
      label: METRIC_LABELS.total_all_time_votes.en,
      value: i.predictions_lifetime.toLocaleString(),
      sub: data.deltas.votes_30d.pct_change != null
        ? `${data.deltas.votes_30d.pct_change >= 0 ? '+' : ''}${data.deltas.votes_30d.pct_change}% vs prev 30d`
        : `${data.deltas.votes_30d.current.toLocaleString()} in last 30d`,
      Icon: Sparkles,
      tooltip: METRIC_LABELS.total_all_time_votes.tooltip_en,
    },
    {
      label: 'Conscious Fund',
      value: fundFmt(i.fund_balance),
      sub: `${fundFmt(i.fund_collected)} raised · ${fundFmt(i.fund_disbursed)} deployed`,
      Icon: HeartHandshake,
    },
    {
      label: METRIC_LABELS.crowd_accuracy.en,
      value: i.crowd_accuracy_pct != null ? `${i.crowd_accuracy_pct}%` : '—',
      sub:
        i.crowd_accuracy_pct != null
          ? `${i.crowd_accuracy_sample.toLocaleString()} resolved votes · ${i.markets_resolved_total} markets`
          : 'Awaiting first resolved markets',
      Icon: Target,
      tooltip: METRIC_LABELS.crowd_accuracy.tooltip_en,
    },
  ]
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map(({ label, value, sub, Icon, tooltip }) => (
        <div
          key={label}
          className="rounded-xl border border-emerald-500/10 bg-gradient-to-br from-[#1a2029] to-[#0f1419] p-5"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
              {label}
              {tooltip && <MetricTooltip text={tooltip} label={`About: ${label}`} />}
            </span>
            <Icon className="h-4 w-4 text-emerald-500/70" aria-hidden />
          </div>
          <div className="text-3xl font-semibold text-[#e8e6df] tabular-nums leading-none">
            {value}
          </div>
          <div className="mt-2 text-[11px] text-slate-500 leading-snug">{sub}</div>
        </div>
      ))}
    </div>
  )
}

function ImpactTab({ data }: { data: IntelligenceDashboardData }) {
  const i = data.impact
  const fundFmt = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(1)}k MXN` : `$${Math.round(n).toLocaleString()} MXN`
  const deployedPct =
    i.fund_collected > 0 ? Math.round((i.fund_disbursed / i.fund_collected) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Hero row — the actual impact narrative */}
      <div className={`${CARD} p-6`}>
        <div className="flex items-center gap-2 text-emerald-400 mb-1">
          <Sparkles className="h-4 w-4" aria-hidden />
          <span className="text-[11px] font-medium uppercase tracking-wider">
            Impact narrative
          </span>
        </div>
        <h2 className="text-xl font-semibold text-[#e8e6df]">
          {i.unique_participants > 0 ? (
            <>
              <span className="text-emerald-400">{i.unique_participants.toLocaleString()}</span>{' '}
              people have shaped {i.predictions_lifetime.toLocaleString()} collective predictions on
              Crowd Conscious.
            </>
          ) : (
            'Building our first cohort of collective predictors.'
          )}
        </h2>
        <p className="mt-2 text-sm text-slate-400 leading-relaxed">
          {i.causes_supported > 0 ? (
            <>
              Together they&apos;ve routed{' '}
              <span className="text-emerald-400">{fundFmt(i.fund_collected)}</span> into the
              Conscious Fund, with{' '}
              <span className="text-emerald-400">{fundFmt(i.fund_disbursed)}</span> already
              deployed across{' '}
              <span className="text-emerald-400">{i.causes_supported}</span> active causes.
            </>
          ) : (
            'Conscious Fund and cause voting will appear here once the first cycle starts.'
          )}
        </p>
      </div>

      {/* Conscious Fund flow */}
      <div className={`${CARD} p-6`}>
        <div className="flex items-baseline justify-between mb-4">
          <h3 className="text-sm font-medium text-slate-400">Conscious Fund flow</h3>
          <span className="text-[11px] text-slate-600">% of raised funds deployed to causes</span>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <FundStat label="Raised" value={fundFmt(i.fund_collected)} accent />
          <FundStat label="Deployed" value={fundFmt(i.fund_disbursed)} />
          <FundStat label="Available" value={fundFmt(i.fund_balance)} />
        </div>
        <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all"
            style={{ width: `${Math.min(100, deployedPct)}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-slate-500">
          <span>{deployedPct}% deployed</span>
          <span>{100 - deployedPct}% on standby</span>
        </div>
      </div>

      {/* Causes + topics side-by-side */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className={`${CARD} p-5`}>
          <div className="flex items-center gap-2 mb-4">
            <HeartHandshake className="h-4 w-4 text-emerald-500/80" aria-hidden />
            <h3 className="text-sm font-medium text-slate-400">Causes leading this cycle</h3>
          </div>
          {i.top_causes_this_cycle.length === 0 ? (
            <p className="text-sm text-slate-600">
              No cause votes yet for {new Date().toISOString().slice(0, 7)}. Causes appear here as
              the community votes on grant allocations.
            </p>
          ) : (
            <ul className="space-y-3">
              {i.top_causes_this_cycle.map((c, idx) => (
                <li key={c.id} className="flex items-start gap-3">
                  <span className="text-emerald-400 font-medium tabular-nums w-6 shrink-0">
                    #{idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-[#e8e6df] truncate">{c.name}</div>
                    {c.organization && (
                      <div className="text-[11px] text-slate-500 truncate">{c.organization}</div>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 tabular-nums shrink-0">
                    {c.vote_count} {c.vote_count === 1 ? 'voto' : 'votos'}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 pt-4 border-t border-white/5 text-[11px] text-slate-500">
            {i.causes_supported} active causes total · cycle {new Date().toISOString().slice(0, 7)}
          </div>
        </div>

        <div className={`${CARD} p-5`}>
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-4 w-4 text-emerald-500/80" aria-hidden />
            <h3 className="text-sm font-medium text-slate-400">Where attention went (last 30 days)</h3>
          </div>
          {i.top_topics_30d.length === 0 ? (
            <p className="text-sm text-slate-600">No votes registered in the last 30 days.</p>
          ) : (
            <ul className="space-y-2">
              {i.top_topics_30d.map((t, idx) => {
                const max = i.top_topics_30d[0]?.vote_count || 1
                const w = Math.max(4, Math.round((t.vote_count / max) * 100))
                return (
                  <li key={t.category}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-[#e8e6df] capitalize">
                        <span className="text-slate-600 mr-2">#{idx + 1}</span>
                        {t.category.replace(/_/g, ' ')}
                      </span>
                      <span className="text-slate-400 tabular-nums">{t.vote_count.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500/60"
                        style={{ width: `${w}%` }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Live + accuracy + WoW deltas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi
          label="Live events hosted"
          value={i.live_events_total}
          hint={`${i.live_events_completed} completed · real-time prediction sessions`}
        />
        <Kpi
          label="Markets resolved"
          value={i.markets_resolved_total}
          hint="Markets with a verified outcome"
        />
        <Kpi
          label="Crowd accuracy"
          value={i.crowd_accuracy_pct != null ? `${i.crowd_accuracy_pct}%` : '—'}
          accent={i.crowd_accuracy_pct != null && i.crowd_accuracy_pct >= 60}
          hint={
            i.crowd_accuracy_sample > 0
              ? `${i.crowd_accuracy_sample.toLocaleString()} resolved votes`
              : 'Awaiting resolved markets'
          }
        />
        <Kpi
          label="Signups (30d)"
          value={data.deltas.signups_30d.current.toLocaleString()}
          delta={data.deltas.signups_30d}
        />
      </div>
    </div>
  )
}

function FundStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div
        className={`mt-1 text-xl font-semibold tabular-nums ${
          accent ? 'text-emerald-400' : 'text-[#e8e6df]'
        }`}
      >
        {value}
      </div>
    </div>
  )
}

/**
 * Sponsor-facing deck — designed to be screenshotted/copied into pitch decks.
 * Lives inside the admin view but is intentionally framed for an external reader,
 * not for an admin debugging the platform.
 */
function SponsorReportTab({
  data,
  sponsorBody,
}: {
  data: IntelligenceDashboardData
  sponsorBody: string
}) {
  const i = data.impact
  const fundFmt = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(1)}k MXN` : `$${Math.round(n).toLocaleString()} MXN`
  const generated = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-medium text-[#e8e6df]">Sponsor-ready snapshot</h2>
          <p className="text-xs text-slate-500">Designed to share with partners + funders</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(sponsorBody)
            }}
            className="rounded-lg border border-white/10 bg-[#1a2029] px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/5"
          >
            Copy as text
          </button>
          <a
            href={`data:text/plain;charset=utf-8,${encodeURIComponent(sponsorBody)}`}
            download={`crowd-conscious-impact-${new Date().toISOString().slice(0, 10)}.txt`}
            className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-medium text-slate-950 hover:bg-emerald-400"
          >
            Download .txt
          </a>
        </div>
      </div>

      {/* Branded card — looks like something you can paste into a deck */}
      <div className="rounded-2xl border border-emerald-500/15 bg-gradient-to-br from-[#1a2029] via-[#151b23] to-[#0f1419] p-7 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-emerald-400">
              Crowd Conscious
            </div>
            <h3 className="text-2xl font-semibold text-[#e8e6df] mt-1">Impact Snapshot</h3>
          </div>
          <span className="text-[11px] text-slate-500">{generated}</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
          <DeckStat label="People reached" value={i.unique_participants.toLocaleString()} />
          <DeckStat label="Predictions cast" value={i.predictions_lifetime.toLocaleString()} />
          <DeckStat label="Conscious Fund" value={fundFmt(i.fund_collected)} accent />
          <DeckStat
            label="Crowd accuracy"
            value={i.crowd_accuracy_pct != null ? `${i.crowd_accuracy_pct}%` : '—'}
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-3">
              Reach &amp; momentum
            </div>
            <ul className="space-y-2 text-sm text-slate-300">
              <DeckLine label="Registered users" value={data.kpis.total_users.toLocaleString()} />
              <DeckLine
                label="Anonymous participants"
                value={(i.unique_participants - data.kpis.total_users).toLocaleString()}
              />
              <DeckLine
                label="Predictions in last 30d"
                value={data.deltas.votes_30d.current.toLocaleString()}
                delta={data.deltas.votes_30d.pct_change}
              />
              <DeckLine
                label="New signups (30d)"
                value={data.deltas.signups_30d.current.toLocaleString()}
                delta={data.deltas.signups_30d.pct_change}
              />
              <DeckLine label="Active markets" value={data.kpis.active_markets.toLocaleString()} />
              <DeckLine
                label="Live events hosted"
                value={`${i.live_events_total} (${i.live_events_completed} completed)`}
              />
            </ul>
          </div>

          <div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-3">
              Impact &amp; trust
            </div>
            <ul className="space-y-2 text-sm text-slate-300">
              <DeckLine label="Fund raised" value={fundFmt(i.fund_collected)} />
              <DeckLine label="Fund deployed" value={fundFmt(i.fund_disbursed)} />
              <DeckLine label="Fund available" value={fundFmt(i.fund_balance)} />
              <DeckLine label="Active causes" value={i.causes_supported.toString()} />
              <DeckLine label="Markets resolved" value={i.markets_resolved_total.toString()} />
              <DeckLine
                label="Avg vote confidence"
                value={
                  data.kpis.avg_confidence != null
                    ? `${data.kpis.avg_confidence.toFixed(2)} / 10`
                    : '—'
                }
              />
            </ul>
          </div>
        </div>

        {i.top_topics_30d.length > 0 && (
          <div className="mt-7 pt-6 border-t border-white/5">
            <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-3">
              Where attention went (last 30 days)
            </div>
            <div className="flex flex-wrap gap-2">
              {i.top_topics_30d.map((t) => (
                <span
                  key={t.category}
                  className="rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1 text-xs text-emerald-300"
                >
                  {t.category.replace(/_/g, ' ')} · {t.vote_count.toLocaleString()}
                </span>
              ))}
            </div>
          </div>
        )}

        {i.top_causes_this_cycle.length > 0 && (
          <div className="mt-6 pt-6 border-t border-white/5">
            <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-3">
              Leading causes this cycle
            </div>
            <ul className="space-y-2">
              {i.top_causes_this_cycle.map((c) => (
                <li key={c.id} className="flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <div className="text-[#e8e6df] truncate">{c.name}</div>
                    {c.organization && (
                      <div className="text-[11px] text-slate-500 truncate">{c.organization}</div>
                    )}
                  </div>
                  <span className="text-emerald-400 tabular-nums shrink-0 ml-3">
                    {c.vote_count} {c.vote_count === 1 ? 'vote' : 'votes'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-7 pt-5 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500">
          <span>crowdconscious.app · transparent collective intelligence</span>
          <span className="inline-flex items-center gap-1 text-emerald-400">
            Read more <ArrowRight className="h-3 w-3" aria-hidden />
          </span>
        </div>
      </div>

      <details className="rounded-xl border border-white/5 bg-[#0f1419]">
        <summary className="cursor-pointer p-4 text-xs text-slate-500 hover:text-slate-300">
          Plain-text version (for email + slides)
        </summary>
        <pre className="px-5 pb-5 text-xs leading-relaxed text-slate-400 whitespace-pre-wrap font-mono overflow-x-auto">
          {sponsorBody}
        </pre>
      </details>
    </div>
  )
}

function DeckStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{label}</div>
      <div
        className={`mt-1 text-2xl font-semibold tabular-nums ${
          accent ? 'text-emerald-400' : 'text-[#e8e6df]'
        }`}
      >
        {value}
      </div>
    </div>
  )
}

function DeckLine({
  label,
  value,
  delta,
}: {
  label: string
  value: string
  delta?: number | null
}) {
  return (
    <li className="flex items-center justify-between gap-3 text-sm border-b border-white/5 pb-1.5 last:border-b-0">
      <span className="text-slate-400">{label}</span>
      <span className="flex items-center gap-2">
        <span className="text-[#e8e6df] tabular-nums">{value}</span>
        {delta != null && (
          <span
            className={`text-[10px] tabular-nums ${
              delta >= 0 ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {delta >= 0 ? '+' : ''}
            {delta}%
          </span>
        )}
      </span>
    </li>
  )
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase()
  if (s === 'active' || s === 'trading') {
    return (
      <span className="inline-flex rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
        {status}
      </span>
    )
  }
  if (s === 'resolved') {
    return (
      <span className="inline-flex rounded-md bg-sky-500/15 px-2 py-0.5 text-[11px] font-medium text-sky-400">
        {status}
      </span>
    )
  }
  return (
    <span className="inline-flex rounded-md bg-white/5 px-2 py-0.5 text-[11px] font-medium text-slate-400">
      {status}
    </span>
  )
}

function mergeDriftLabels(series: { points: { t: string }[] }[]): string[] {
  const set = new Set<string>()
  for (const s of series) {
    for (const p of s.points) {
      set.add(p.t.slice(0, 10))
    }
  }
  return [...set].sort()
}

function alignDrift(labels: string[], s: { points: { t: string; y: number }[] }): (number | null)[] {
  const byDay = new Map<string, number>()
  for (const p of s.points) {
    byDay.set(p.t.slice(0, 10), p.y * 100)
  }
  return labels.map((l) => (byDay.has(l) ? byDay.get(l)! : null))
}

function driftColor(i: number) {
  const c = ['#10b981', '#38bdf8', '#a78bfa', '#fb7185', '#fbbf24']
  return c[i % c.length]
}
