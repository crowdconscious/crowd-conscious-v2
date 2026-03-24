'use client'

import { useMemo, useState, useCallback } from 'react'
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
import { BarChart3, Download, LineChart, PieChart, Share2, Sparkles, Table2, Users } from 'lucide-react'
import type { IntelligenceDashboardData, MarketRowCsv } from '@/lib/intelligence-data'

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

const BG = '#0a0e14'
const ACCENT = '#10b981'
const BORDER = 'rgba(148, 163, 184, 0.25)'
const TEXT = '#e2e8f0'

const chartOptsBase = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: { color: TEXT },
    },
  },
  scales: {
    x: {
      ticks: { color: '#94a3b8' },
      grid: { color: BORDER },
    },
    y: {
      ticks: { color: '#94a3b8' },
      grid: { color: BORDER },
    },
  },
}

function downloadCSV(rows: MarketRowCsv[]) {
  const headers = ['Market', 'Category', 'Total Votes', 'YES %', 'Status', 'Resolution Date']
  const lines = [
    headers.join(','),
    ...rows.map((m) =>
      [
        `"${(m.title || '').replace(/"/g, '""')}"`,
        m.category,
        m.total_votes,
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
      meta: `Basado en: ${topMarket.total_votes} votos`,
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
      meta: `Basado en ${data.kpis.total_votes} votos y ${data.kpis.active_markets} mercados activos`,
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

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <PieChart className="w-4 h-4" /> },
  { id: 'markets', label: 'Markets', icon: <Table2 className="w-4 h-4" /> },
  { id: 'users', label: 'Users', icon: <Users className="w-4 h-4" /> },
  { id: 'sentiment', label: 'Sentiment', icon: <LineChart className="w-4 h-4" /> },
  { id: 'headlines', label: 'Headlines', icon: <Sparkles className="w-4 h-4" /> },
  { id: 'share', label: 'Share Cards', icon: <Share2 className="w-4 h-4" /> },
  { id: 'sponsor', label: 'Sponsor Report', icon: <BarChart3 className="w-4 h-4" /> },
]

export default function IntelligenceClient({ data }: { data: IntelligenceDashboardData }) {
  const [tab, setTab] = useState<TabId>('overview')
  const [range, setRange] = useState<7 | 30 | 90>(30)

  const filteredVotesTime = useMemo(() => {
    const n = range === 7 ? 7 : range === 30 ? 30 : 90
    return data.votesOverTime.slice(-n)
  }, [data.votesOverTime, range])

  const filteredSignups = useMemo(() => {
    const n = range === 7 ? 7 : range === 30 ? 30 : 90
    return data.signupsOverTime.slice(-n)
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
    const canvas = await mod.default(el, { backgroundColor: BG, scale: 2 })
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
      `- Registered votes (non-anonymous): ${data.kpis.registered_votes.toLocaleString()}`,
      `- Total votes (incl. guests): ${data.kpis.total_votes.toLocaleString()}`,
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
    <div className="min-h-screen text-slate-200" style={{ background: BG }}>
      <div className="sticky top-0 z-20 border-b border-slate-800/80 backdrop-blur-md px-4 py-3 flex flex-wrap items-center justify-between gap-3" style={{ background: 'rgba(10,14,20,0.92)' }}>
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-400" />
            Intelligence Hub
          </h1>
          <p className="text-xs text-slate-500">Admin-only analytics · Real Supabase data</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={range}
            onChange={(e) => setRange(Number(e.target.value) as 7 | 30 | 90)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-sm"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days (chart window)</option>
          </select>
          <button
            type="button"
            onClick={() => downloadCSV(data.allMarkets)}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-3 py-1.5"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <Link href="/admin" className="text-sm text-slate-400 hover:text-white">
            ← Admin
          </Link>
        </div>
      </div>

      {!data.loadedWithServiceRole && (
        <div className="mx-4 mt-4 rounded-lg border border-amber-700/50 bg-amber-950/40 px-4 py-3 text-amber-200 text-sm">
          Service role key missing — KPIs may be empty in local dev. Configure SUPABASE_SERVICE_ROLE_KEY.
        </div>
      )}
      {data.errors.length > 0 && (
        <div className="mx-4 mt-4 rounded-lg border border-red-800/50 bg-red-950/30 px-4 py-2 text-red-200 text-xs font-mono">
          {data.errors.slice(0, 3).join(' · ')}
        </div>
      )}

      <div className="flex flex-col md:flex-row max-w-[1600px] mx-auto">
        <nav className="md:w-56 shrink-0 border-b md:border-b-0 md:border-r border-slate-800 p-3 space-y-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-left transition-colors ${
                tab === t.id ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:bg-slate-800/80'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </nav>

        <main className="flex-1 p-4 md:p-6 space-y-8 min-w-0">
          {tab === 'overview' && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Kpi label="Registered votes" value={data.kpis.registered_votes} />
                <Kpi label="Total votes" value={data.kpis.total_votes} />
                <Kpi label="Users (profiles)" value={data.kpis.total_users} />
                <Kpi label="Active markets" value={data.kpis.active_markets} />
                <Kpi label="Orphan markets (0 votes)" value={data.kpis.orphan_markets} />
                <Kpi label="Avg confidence" value={data.kpis.avg_confidence != null ? data.kpis.avg_confidence.toFixed(2) : '—'} />
                <Kpi label="Fund total" value={data.kpis.fund_total != null ? data.kpis.fund_total.toLocaleString() : '—'} />
              </div>
              {data.voterSplit.some((v) => v.count > 0) && (
                <div className="h-56 max-w-md rounded-xl border border-slate-800 p-4 bg-slate-900/40">
                  <h3 className="text-sm font-semibold text-slate-300 mb-2">Registered vs anonymous votes</h3>
                  <Doughnut
                    data={{
                      labels: data.voterSplit.map((v) =>
                        v.voter_type === 'anonymous' ? 'Anonymous (guest)' : 'Registered'
                      ),
                      datasets: [
                        {
                          data: data.voterSplit.map((v) => v.count),
                          backgroundColor: ['rgba(148,163,184,0.75)', 'rgba(16,185,129,0.85)'],
                          borderColor: BORDER,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { position: 'bottom', labels: { color: TEXT } } },
                    }}
                  />
                </div>
              )}
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="h-72 rounded-xl border border-slate-800 p-4 bg-slate-900/40">
                  <h3 className="text-sm font-semibold text-slate-300 mb-2">Votes per day</h3>
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
                        },
                      ],
                    }}
                    options={{ ...chartOptsBase, plugins: { ...chartOptsBase.plugins, legend: { display: false } } }}
                  />
                </div>
                <div className="h-72 rounded-xl border border-slate-800 p-4 bg-slate-900/40">
                  <h3 className="text-sm font-semibold text-slate-300 mb-2">Votes by category</h3>
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
              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-2">Top markets</h3>
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-900/80 text-slate-400">
                      <tr>
                        <th className="text-left p-2">Title</th>
                        <th className="text-left p-2">Cat</th>
                        <th className="text-right p-2">Votes</th>
                        <th className="text-right p-2">YES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topMarkets.map((m) => (
                        <tr key={m.id} className="border-t border-slate-800/80">
                          <td className="p-2 max-w-md truncate">{m.title}</td>
                          <td className="p-2">{m.category}</td>
                          <td className="p-2 text-right">{m.total_votes}</td>
                          <td className="p-2 text-right">{Math.round(m.yes_probability * 100)}%</td>
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
              <div className="h-80 rounded-xl border border-slate-800 p-4 bg-slate-900/40">
                <h3 className="text-sm font-semibold text-slate-300 mb-2">Probability drift (top 5 markets, ~4 weeks)</h3>
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
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-sm min-w-[800px]">
                  <thead className="bg-slate-900/80 text-slate-400">
                    <tr>
                      <th className="text-left p-2">Market</th>
                      <th className="text-left p-2">Category</th>
                      <th className="text-right p-2">Votes</th>
                      <th className="text-left p-2 min-w-[200px]">YES %</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Resolves</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.allMarkets.map((m) => (
                      <tr key={m.id} className="border-t border-slate-800/80">
                        <td className="p-2 max-w-xs truncate">{m.title}</td>
                        <td className="p-2">{m.category}</td>
                        <td className="p-2 text-right">{m.total_votes}</td>
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <div className="h-2 flex-1 rounded-full bg-slate-800 overflow-hidden min-w-[80px]">
                              <div
                                className="h-full rounded-full bg-emerald-500"
                                style={{ width: `${Math.round(m.yes_probability * 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-400 w-10">{Math.round(m.yes_probability * 100)}%</span>
                          </div>
                        </td>
                        <td className="p-2">{m.status}</td>
                        <td className="p-2 text-xs text-slate-500">{m.resolution_date?.slice(0, 10) ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'users' && (
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="h-72 rounded-xl border border-slate-800 p-4 bg-slate-900/40">
                <h3 className="text-sm font-semibold text-slate-300 mb-2">New profiles (signups) by day</h3>
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
              <div className="h-72 rounded-xl border border-slate-800 p-4 bg-slate-900/40">
                <h3 className="text-sm font-semibold text-slate-300 mb-2">XP leaderboard (top 10)</h3>
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
              <div className="lg:col-span-2 h-64 rounded-xl border border-slate-800 p-4 bg-slate-900/40">
                <h3 className="text-sm font-semibold text-slate-300 mb-2">Accuracy distribution (top 50 users by XP)</h3>
                <Bar
                  data={{
                    labels: data.accuracyBuckets.map((b) => b.label),
                    datasets: [
                      {
                        label: 'Users',
                        data: data.accuracyBuckets.map((b) => b.count),
                        backgroundColor: 'rgba(59,130,246,0.55)',
                      },
                    ],
                  }}
                  options={{ ...chartOptsBase, plugins: { legend: { display: false } } }}
                />
              </div>
              <div className="lg:col-span-2 overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-sm">
                  <thead className="bg-slate-900/80 text-slate-400">
                    <tr>
                      <th className="text-left p-2">#</th>
                      <th className="text-left p-2">Name</th>
                      <th className="text-right p-2">XP</th>
                      <th className="text-right p-2">Votes</th>
                      <th className="text-right p-2">Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.leaderboard.map((l, i) => (
                      <tr key={i} className="border-t border-slate-800/80">
                        <td className="p-2">{i + 1}</td>
                        <td className="p-2">{l.display_name || 'Anonymous'}</td>
                        <td className="p-2 text-right">{l.total_xp.toLocaleString()}</td>
                        <td className="p-2 text-right">{l.votes_cast}</td>
                        <td className="p-2 text-right">{l.accuracy_pct != null ? `${l.accuracy_pct}%` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'sentiment' && (
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="h-96 rounded-xl border border-slate-800 p-4 bg-slate-900/40">
                <h3 className="text-sm font-semibold text-slate-300 mb-2">YES % by category (weighted)</h3>
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
              <div className="h-96 rounded-xl border border-slate-800 p-4 bg-slate-900/40">
                <h3 className="text-sm font-semibold text-slate-300 mb-2">YES vs NO (vote_count on outcomes)</h3>
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
              <div className="lg:col-span-2 h-64 rounded-xl border border-slate-800 p-4 bg-slate-900/40">
                <h3 className="text-sm font-semibold text-slate-300 mb-2">Confidence (1–10)</h3>
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
                  className={`rounded-xl border p-4 ${
                    h.color === 'green'
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : h.color === 'amber'
                        ? 'border-amber-500/30 bg-amber-500/5'
                        : 'border-sky-500/30 bg-sky-500/5'
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
                    className="rounded-2xl border border-slate-700 overflow-hidden shadow-xl"
                    style={{ background: 'linear-gradient(145deg, #0f172a 0%, #020617 100%)' }}
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
                        <span className="text-slate-400 text-sm">{m.total_votes.toLocaleString()} predicciones</span>
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
                    className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm text-white border border-slate-700"
                  >
                    Download card (PNG)
                  </button>
                </div>
              ))}
            </div>
          )}

          {tab === 'sponsor' && (
            <div className="max-w-3xl space-y-4">
              <pre className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-xs text-slate-300 whitespace-pre-wrap font-mono overflow-x-auto">
                {sponsorBody}
              </pre>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(sponsorBody)
                }}
                className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-sm text-white"
              >
                Copy report
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <div className="text-xs text-slate-500 uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-bold text-white mt-1">{value}</div>
    </div>
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
