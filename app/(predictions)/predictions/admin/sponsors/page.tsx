'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Users,
  BarChart3,
  Heart,
  ExternalLink,
  Copy,
  DollarSign,
  Calendar,
} from 'lucide-react'

type Sponsorship = {
  id: string
  sponsor_name: string
  sponsor_email: string
  sponsor_url: string | null
  amount_mxn: number
  tier: string
  status: string
  market_id: string | null
  category: string | null
  fund_amount: number | null
  start_date: string
  end_date: string | null
  created_at: string
  market_ids: string[]
  market_titles: string[]
  total_predictions: number
  unique_users: number
  fund_contribution_mxn: number
  fund_status: string
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  active: { label: 'Active', bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  expired: { label: 'Expired', bg: 'bg-slate-500/20', text: 'text-slate-400' },
  pending: { label: 'Pending', bg: 'bg-amber-500/20', text: 'text-amber-400' },
  paid: { label: 'Paid', bg: 'bg-blue-500/20', text: 'text-blue-400' },
  cancelled: { label: 'Cancelled', bg: 'bg-red-500/20', text: 'text-red-400' },
}

const TIER_LABELS: Record<string, string> = {
  market: 'Market',
  category: 'Category',
  impact: 'Impact',
  patron: 'Patron',
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

export default function AdminSponsorsPage() {
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchSponsors = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/predictions/admin/sponsors')
      const data = await res.json()
      if (res.status === 403) {
        window.location.href = '/predictions'
        return
      }
      if (!res.ok) throw new Error(data.error || 'Failed to fetch')
      setSponsorships(data.sponsorships ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSponsors()
  }, [fetchSponsors])

  const copyReportLink = (s: Sponsorship) => {
    const base = window.location.origin
    const token = (s as { report_token?: string }).report_token
    if (!token) {
      alert('No report token — sponsor was created before this feature. Run migration 142.')
      return
    }
    const url = `${base}/sponsor/report/${s.id}?token=${encodeURIComponent(token)}`
    navigator.clipboard.writeText(url)
    alert('Report link copied to clipboard')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href="/predictions"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-emerald-400"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to dashboard
      </Link>

      <h1 className="text-2xl font-bold text-white">Sponsors</h1>
      <p className="text-slate-400">
        View all sponsorships and their analytics. Share the report link with sponsors for their private dashboard.
      </p>

      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : sponsorships.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-slate-900/50 border border-slate-800 rounded-xl">
          <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">No sponsorships yet</p>
          <p className="text-sm mt-2">Sponsors will appear here after completing checkout</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sponsorships.map((s) => {
            const statusConfig = STATUS_CONFIG[s.status] || STATUS_CONFIG.pending
            const tierLabel = TIER_LABELS[s.tier] ?? s.tier
            const marketOrCategory = s.market_titles?.length
              ? s.market_titles.join(', ')
              : s.category
                ? `Category: ${s.category}`
                : s.market_id
                  ? 'Single market'
                  : '—'
            const isExpanded = expandedId === s.id

            return (
              <div
                key={s.id}
                className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : s.id)}
                  className="w-full flex items-center justify-between gap-4 px-4 py-4 text-left hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-white truncate">{s.sponsor_name}</p>
                      <p className="text-sm text-slate-400 truncate">
                        {tierLabel} · {formatCurrency(s.amount_mxn)} · {marketOrCategory}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}
                    >
                      {statusConfig.label}
                    </span>
                    <span className="text-slate-500 text-sm">
                      {formatDate(s.start_date)} – {formatDate(s.end_date)}
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 border-t border-slate-800 space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
                      <div className="bg-slate-800/50 rounded-lg p-3">
                        <p className="text-slate-500 text-xs flex items-center gap-1">
                          <BarChart3 className="w-3.5 h-3.5" />
                          Total predictions
                        </p>
                        <p className="text-white font-semibold mt-1">{s.total_predictions.toLocaleString()}</p>
                      </div>
                      <div className="bg-slate-800/50 rounded-lg p-3">
                        <p className="text-slate-500 text-xs flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          Unique users
                        </p>
                        <p className="text-white font-semibold mt-1">{s.unique_users.toLocaleString()}</p>
                      </div>
                      <div className="bg-slate-800/50 rounded-lg p-3">
                        <p className="text-slate-500 text-xs flex items-center gap-1">
                          <Heart className="w-3.5 h-3.5" />
                          Fund contribution
                        </p>
                        <p className="text-emerald-400 font-semibold mt-1">
                          {formatCurrency(s.fund_contribution_mxn)}
                        </p>
                      </div>
                      <div className="bg-slate-800/50 rounded-lg p-3">
                        <p className="text-slate-500 text-xs flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          Fund status
                        </p>
                        <p className="text-white font-semibold mt-1 capitalize">{s.fund_status}</p>
                      </div>
                    </div>

                    {s.market_titles?.length > 0 && (
                      <div>
                        <p className="text-slate-500 text-xs mb-2">Sponsored market(s)</p>
                        <div className="flex flex-wrap gap-2">
                          {s.market_titles.map((title, i) => (
                            <Link
                              key={i}
                              href={`/predictions/markets/${s.market_ids?.[i]}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 text-emerald-400 text-sm hover:bg-slate-700"
                            >
                              {title}
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => copyReportLink(s)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-sm hover:bg-slate-700"
                      >
                        <Copy className="w-4 h-4" />
                        Copy report link
                      </button>
                      {s.sponsor_url && (
                        <a
                          href={s.sponsor_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-sm hover:bg-slate-700"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Sponsor website
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
