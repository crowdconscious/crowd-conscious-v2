'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, XCircle, Ban, ExternalLink } from 'lucide-react'
import { toDisplayPercent } from '@/lib/probability-utils'

type Outcome = { id: string; label: string; probability: number; vote_count: number }

type Market = {
  id: string
  title: string
  resolution_date: string
  resolution_criteria: string
  verification_sources: string[]
  total_volume: number
  market_type?: string
  status: string
  trade_count: number
  trader_count: number
  vote_count?: number
}

type ModalType = 'resolve_outcome' | 'resolve_yes' | 'resolve_no' | 'cancel' | null

export default function AdminResolvePage() {
  const [markets, setMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState<{ type: ModalType; market: Market } | null>(null)
  const [outcomes, setOutcomes] = useState<Outcome[]>([])
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<string>('')
  const [evidenceUrl, setEvidenceUrl] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resolveResult, setResolveResult] = useState<{ total_voters: number; correct_voters: number; winning_outcome: string } | null>(null)

  const fetchMarkets = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/predictions/admin/markets-to-resolve')
      const data = await res.json()
      if (res.status === 403) {
        window.location.href = '/predictions'
        return
      }
      if (!res.ok) throw new Error(data.error || 'Failed to fetch')
      setMarkets(data.markets || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMarkets()
  }, [])

  useEffect(() => {
    if (modal?.type === 'resolve_outcome' && modal.market) {
      fetch(`/api/predictions/markets/${modal.market.id}/outcomes`)
        .then((r) => r.json())
        .then((d) => {
          setOutcomes(d.outcomes || [])
          setSelectedOutcomeId(d.outcomes?.[0]?.id || '')
        })
        .catch(() => setOutcomes([]))
    } else {
      setResolveResult(null)
      setOutcomes([])
    }
  }, [modal?.type, modal?.market?.id])

  const handleResolveOutcome = async () => {
    if (!modal?.market || modal.type !== 'resolve_outcome' || !selectedOutcomeId) return

    setSubmitting(true)
    setResolveResult(null)
    try {
      const res = await fetch('/api/predictions/admin/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          market_id: modal.market.id,
          winning_outcome_id: selectedOutcomeId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Resolution failed')
      setResolveResult({
        total_voters: data.total_voters ?? 0,
        correct_voters: data.correct_voters ?? 0,
        winning_outcome: data.winning_outcome ?? 'Unknown',
      })
      setTimeout(() => {
        setModal(null)
        setEvidenceUrl('')
        setAdminNotes('')
        setResolveResult(null)
        fetchMarkets()
      }, 2000)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Resolution failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleResolve = async () => {
    if (!modal?.market || (modal.type !== 'resolve_yes' && modal.type !== 'resolve_no')) return
    if (!evidenceUrl.trim()) {
      alert('Evidence URL is required')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/predictions/admin/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          market_id: modal.market.id,
          outcome: modal.type === 'resolve_yes',
          evidence_url: evidenceUrl.trim(),
          admin_notes: adminNotes.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Resolution failed')
      setModal(null)
      setEvidenceUrl('')
      setAdminNotes('')
      fetchMarkets()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Resolution failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = async () => {
    if (!modal?.market || modal.type !== 'cancel') return

    setSubmitting(true)
    try {
      const res = await fetch('/api/predictions/admin/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          market_id: modal.market.id,
          reason: cancelReason.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Cancellation failed')
      setModal(null)
      setCancelReason('')
      fetchMarkets()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Cancellation failed')
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const isPastDue = (d: string) => new Date(d) < new Date()

  const voteCount = (m: Market) => m.vote_count ?? m.trader_count ?? 0

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href="/predictions"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-emerald-400"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to dashboard
      </Link>

      <h1 className="text-2xl font-bold text-white">Resolve Markets</h1>
      <p className="text-slate-400">
        Resolve or cancel prediction markets. Select the winning outcome for free-to-play markets.
      </p>

      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : markets.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-lg">No markets to resolve</p>
          <p className="text-sm mt-2">All active markets are up to date</p>
        </div>
      ) : (
        <div className="space-y-4">
          {markets.map((m) => (
            <div
              key={m.id}
              className={`bg-slate-900 border rounded-xl p-6 ${
                isPastDue(m.resolution_date) ? 'border-amber-500/50' : 'border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white mb-1">{m.title}</h3>
                  <p className="text-slate-400 text-sm mb-2">
                    Resolution date: {formatDate(m.resolution_date)}
                    {isPastDue(m.resolution_date) && (
                      <span className="ml-2 text-amber-400">(Past due)</span>
                    )}
                  </p>
                  <p className="text-slate-500 text-sm mb-2">
                    <span className="text-slate-400">Criteria:</span> {m.resolution_criteria}
                  </p>
                  {m.verification_sources?.length > 0 && (
                    <p className="text-slate-500 text-sm">
                      <span className="text-slate-400">Sources:</span>{' '}
                      {m.verification_sources.join(', ')}
                    </p>
                  )}
                  <div className="flex gap-4 mt-2 text-sm text-slate-400">
                    <span>{voteCount(m)} predictions</span>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0 flex-wrap">
                  <button
                    onClick={() => setModal({ type: 'resolve_outcome', market: m })}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Select winner
                  </button>
                  <button
                    onClick={() => setModal({ type: 'resolve_yes', market: m })}
                    className="px-4 py-2 rounded-lg bg-emerald-600/80 hover:bg-emerald-500/80 text-white text-sm font-medium flex items-center gap-2"
                  >
                    Resolve YES
                  </button>
                  <button
                    onClick={() => setModal({ type: 'resolve_no', market: m })}
                    className="px-4 py-2 rounded-lg bg-red-600/80 hover:bg-red-500/80 text-white text-sm font-medium flex items-center gap-2"
                  >
                    Resolve NO
                  </button>
                  <button
                    onClick={() => setModal({ type: 'cancel', market: m })}
                    className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium flex items-center gap-2"
                  >
                    <Ban className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resolve with outcome selection modal */}
      {modal?.type === 'resolve_outcome' ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setModal(null)} />
          <div className="relative bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-4">
              Select winning outcome — {modal.market.title.slice(0, 50)}...
            </h3>
            {outcomes.length > 0 ? (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Winning outcome</label>
                  <select
                    value={selectedOutcomeId}
                    onChange={(e) => setSelectedOutcomeId(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    {outcomes.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label} ({Math.round(toDisplayPercent(o.probability || 0))}%, {o.vote_count} votes)
                      </option>
                    ))}
                  </select>
                </div>
                {resolveResult ? (
                  <div className="p-4 bg-emerald-500/20 border border-emerald-500/50 rounded-lg mb-4">
                    <p className="text-emerald-400 font-medium">Resolution complete!</p>
                    <p className="text-slate-300 text-sm mt-1">
                      {resolveResult.correct_voters} of {resolveResult.total_voters} predictors were correct.
                    </p>
                    <p className="text-slate-400 text-sm">Bonus XP awarded to correct voters.</p>
                  </div>
                ) : (
                  <div className="flex gap-2 mt-6">
                    <button
                      onClick={() => setModal(null)}
                      className="flex-1 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleResolveOutcome}
                      disabled={submitting || !selectedOutcomeId}
                      className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium disabled:opacity-50"
                    >
                      {submitting ? 'Resolving...' : 'Confirm'}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <p className="text-slate-400 text-sm mb-4">
                No outcomes found. Use &quot;Resolve YES&quot; or &quot;Resolve NO&quot; for legacy markets.
              </p>
            )}
          </div>
        </div>
      ) : null}

      {/* Legacy resolve YES/NO modal */}
      {modal?.type === 'resolve_yes' || modal?.type === 'resolve_no' ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setModal(null)} />
          <div className="relative bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-4">
              Resolve {modal.type === 'resolve_yes' ? 'YES' : 'NO'} — {modal.market.title.slice(0, 50)}...
            </h3>
            <p className="text-emerald-400 mb-4">
              80% of sponsor contributions go to the Conscious Fund. Are you sure?
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Evidence URL (required)</label>
                <input
                  type="url"
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Admin notes (optional)</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Internal notes..."
                  rows={2}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setModal(null)}
                className="flex-1 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={submitting || !evidenceUrl.trim()}
                className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium disabled:opacity-50"
              >
                {submitting ? 'Resolving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Cancel confirmation modal */}
      {modal?.type === 'cancel' ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setModal(null)} />
          <div className="relative bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-4">
              Cancel market — {modal.market.title.slice(0, 50)}...
            </h3>
            <p className="text-slate-400 text-sm mb-4">
              This will close the market. For legacy markets with positions, traders will receive refunds.
            </p>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Reason (optional)</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Why is this market being cancelled?"
                rows={3}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500"
              />
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setModal(null)}
                className="flex-1 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                Back
              </button>
              <button
                onClick={handleCancel}
                disabled={submitting}
                className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium disabled:opacity-50"
              >
                {submitting ? 'Cancelling...' : 'Confirm cancel'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
