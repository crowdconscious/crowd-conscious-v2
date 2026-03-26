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
import { BarChart3, Download, Shield } from 'lucide-react'
import type { IntelligenceDashboardData, MarketRowCsv, VoteChangeLeader } from '@/lib/intelligence-data'

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

function generateHeadlines(data: IntelligenceDashboardData) {
  const headlines: { type: string; color: string; text: string; meta: string }[] = []
  const topMarket = data.topMarkets[0]
  if (topMarket) {
    const pct = Math.round(topMarket.yes_probability * 100)
    headlines.push({
      type: 'Top finding',
      color: 'green',
      text: `"${pct}% de la comunidad inclina su predicción hacia "${topMarket.title.slice(0, 80)}${topMarket.title.length > 80 ? '…' : ''}", según datos agregados en Crowd Conscious."`,
      meta: `Basado en: ${topMarket.total_votes} votantes registrados (probabilidad de comunidad)`,
    })
  }

  const sorted = [...data.topMarkets].sort(
    (a, b) => Math.abs(b.yes_probability - 0.5) - Math.abs(a.yes_probability - 0.5)
  )
  const consensus = sorted[0]
  if (consensus) {
    headlines.push({
      type: 'Mayor consenso',
      color: 'emerald',
      text: `El mercado más polarizado estadísticamente muestra un YES implícito de ~${Math.round(consensus.yes_probability * 100)}%.`,
      meta: consensus.title.slice(0, 80),
    })
  }

  const contested = [...data.topMarkets].sort(
    (a, b) => Math.abs(a.yes_probability - 0.5) - Math.abs(b.yes_probability - 0.5)
  )[0]
  if (contested) {
    headlines.push({
      type: 'Más disputado',
      color: 'amber',
      text: `Mercado más cercano al 50/50: ~${Math.round(contested.yes_probability * 100)}% YES — alta incertidumbre colectiva.`,
      meta: contested.title.slice(0, 80),
    })
  }

  const sent = data.sentimentByCategory
  if (sent.length) {
    const avgYes =
      sent.reduce((s, c) => s + c.avg_yes_probability, 0) / sent.length
    headlines.push({
      type: 'Índice de optimismo',
      color: 'blue',
      text: `La comunidad muestra un ${Math.round(avgYes * 100)}% de probabilidad YES promedio ponderada por categoría.`,
      meta: `Basado en ${data.kpis.total_engagement.toLocaleString()} participaciones y ${data.kpis.active_markets} mercados activos`,
    })
  }

  return headlines
}

type TabId =
  | 'overview'
  | 'markets'
  | 'users'
  | 'sentiment'
  | 'headlines'
  | 'share'
  | 'sponsor'

const TABS: { id: TabId; label: string }[] = [
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

export default function IntelligenceClient({ data }: { data: IntelligenceDashboardData }) {
  const [tab, setTab] = useState<TabId>('overview')
  const [range, setRange] = useState<RangeKey>('30')

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

  const yesNoDoughnut = useMemo(() => {
    const yes = data.outcomeAgg.filter((o) => isYesLike(o.label)).reduce((s, o) => s + o.total_votes, 0)
    const no = data.outcomeAgg.filter((o) => isNoLike(o.label)).reduce((s, o) => s + o.total_votes, 0)
    const other = data.outcomeAgg
      .filter((o) => !isYesLike(o.label) && !isNoLike(o.label))
      .reduce((s, o) => s + o.total_votes, 0)
    return { yes, no, other }
  }, [data.outcomeAgg])

  const radarSentiment = useMemo(() => {
    const labels = data.sentimentByCategory.map((s) => s.category)
    const values = data.sentimentByCategory.map((s) => Math.round(s.avg_yes_probability * 100))
    return { labels, values }
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
    return [
      `Crowd Conscious — Intelligence snapshot`,
      `Generated: ${new Date().toISOString().slice(0, 10)}`,
      ``,
      `Platform KPIs`,
      `- Registered voters: ${data.kpis.registered_votes.toLocaleString()}`,
      `- Total engagement (all interactions): ${data.kpis.total_engagement.toLocaleString()}`,
      `- Anonymous share of engagement: ${data.kpis.anonymous_engagement_rate_pct != null ? `${data.kpis.anonymous_engagement_rate_pct}%` : '—'}`,
      `- Profiles (users): ${data.kpis.total_users.toLocaleString()}`,
      `- Active markets: ${data.kpis.active_markets}`,
      `- Markets with 0 votes: ${data.kpis.orphan_markets}`,
      `- Avg confidence: ${data.kpis.avg_confidence != null ? data.kpis.avg_confidence.toFixed(2) : '—'}`,
      `- Conscious fund (total_collected / balance): ${data.kpis.fund_total != null ? data.kpis.fund_total.toLocaleString() : '—'}`,
      ``,
      `Voter mix`,
      ...data.voterSplit.map((v) => `  ${v.voter_type}: ${v.count.toLocaleString()}`),
      ``,
      `Top market: ${data.topMarkets[0]?.title ?? '—'}`,
    ].join('\n')
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
          <p className="text-sm text-slate-500">Admin analytics · Real Supabase data</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          {tab === 'overview' && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Kpi label="Registered voters" value={data.kpis.registered_votes} />
                <Kpi label="Total engagement" value={data.kpis.total_engagement} />
                <Kpi
                  label="Anonymous share"
                  value={
                    data.kpis.anonymous_engagement_rate_pct != null
                      ? `${data.kpis.anonymous_engagement_rate_pct}%`
                      : '—'
                  }
                />
                <Kpi label="Users" value={data.kpis.total_users} />
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Kpi label="Active markets" value={data.kpis.active_markets} />
                <Kpi
                  label="Avg confidence"
                  value={data.kpis.avg_confidence != null ? data.kpis.avg_confidence.toFixed(2) : '—'}
                />
                <Kpi
                  label="Conscious fund"
                  value={data.kpis.fund_total != null ? data.kpis.fund_total.toLocaleString() : '—'}
                  accent
                />
                <Kpi label="Orphan markets (0 votes)" value={data.kpis.orphan_markets} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Kpi
                  label="Vote updates (7d, registered)"
                  value={data.kpis.vote_changes_week}
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
                <h3 className="text-sm font-medium text-slate-500 mb-3">YES % by category (weighted)</h3>
                <Radar
                  data={{
                    labels: radarSentiment.labels,
                    datasets: [
                      {
                        label: 'Avg YES %',
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
                    plugins: { legend: { labels: { color: TEXT } } },
                  }}
                />
              </div>
              <div className={`h-96 ${CARD} p-5`}>
                <h3 className="text-sm font-medium text-slate-500 mb-3">YES vs NO (outcomes)</h3>
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
              <div className={`lg:col-span-2 h-64 ${CARD} p-5`}>
                <h3 className="text-sm font-medium text-slate-500 mb-3">Confidence (1–10)</h3>
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

          {tab === 'sponsor' && (
            <div className="max-w-3xl space-y-4">
              <pre className="rounded-xl border border-white/5 bg-[#0f1419] p-5 text-xs leading-relaxed text-slate-400 whitespace-pre-wrap font-mono overflow-x-auto">
                {sponsorBody}
              </pre>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(sponsorBody)
                }}
                className="rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-medium text-slate-950 hover:bg-emerald-400"
              >
                Copy report
              </button>
            </div>
          )}
      </main>
    </div>
  )
}

function Kpi({
  label,
  value,
  accent,
}: {
  label: string
  value: string | number
  accent?: boolean
}) {
  return (
    <div className={`${CARD} p-5`}>
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div
        className={`mt-1 text-2xl font-medium ${accent ? 'text-emerald-400' : 'text-[#e8e6df]'}`}
      >
        {value}
      </div>
    </div>
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

function isYesLike(label: string) {
  const l = label.trim().toLowerCase()
  return l === 'yes' || l === 'sí' || l === 'si' || l.startsWith('yes')
}

function isNoLike(label: string) {
  const l = label.trim().toLowerCase()
  return l === 'no' || l.startsWith('no ')
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
