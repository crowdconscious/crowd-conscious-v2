'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, X, Target } from 'lucide-react'
import ShareButton from '@/components/ShareButton'

type VoteItem = {
  id: string
  market_id: string
  market_title: string
  market_status: string
  outcome_label: string
  confidence: number
  xp_earned: number
  bonus_xp: number
  is_correct: boolean | null
  created_at: string
}

const PAGE_SIZE = 15

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function PredictionsTradesPage() {
  const [items, setItems] = useState<VoteItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)

  const fetchPredictions = async (offset: number) => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/predictions/my-predictions?limit=${PAGE_SIZE}&offset=${offset}`
      )
      const data = await res.json()
      if (data.items) setItems(data.items)
      if (data.pagination?.total != null) setTotal(data.pagination.total)
    } catch (err) {
      console.error('Fetch predictions error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPredictions(page * PAGE_SIZE)
  }, [page])

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const resolvedItems = items.filter((i) => i.market_status === 'resolved')
  const correctCount = resolvedItems.filter((i) => i.is_correct === true).length
  const accuracy = resolvedItems.length > 0 ? (correctCount / resolvedItems.length) * 100 : 0
  const totalXp = items.reduce((s, i) => s + i.xp_earned + i.bonus_xp, 0)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href="/predictions"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-emerald-400"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to dashboard
      </Link>

      <h1 className="text-2xl font-bold text-white">My Predictions</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-[#2d3748] bg-[#1a2029] p-4">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            <Target className="w-4 h-4" />
            Total predictions
          </div>
          <p className="text-xl font-bold text-white">{items.length}</p>
        </div>
        <div className="rounded-xl border border-[#2d3748] bg-[#1a2029] p-4">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            Accuracy
          </div>
          <p className="text-xl font-bold text-emerald-400">
            {resolvedItems.length === 0 ? '—' : `${accuracy.toFixed(0)}%`}
          </p>
          {resolvedItems.length === 0 && (
            <p className="text-slate-500 text-xs mt-0.5">No resolved markets yet</p>
          )}
        </div>
        <div className="rounded-xl border border-[#2d3748] bg-[#1a2029] p-4">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            XP earned
          </div>
          <p className="text-xl font-bold text-amber-400">{totalXp} XP</p>
        </div>
      </div>

      {/* Predictions list */}
      <div className="overflow-hidden rounded-xl border border-[#2d3748] bg-[#1a2029]">
        <h2 className="border-b border-[#2d3748] px-6 py-4 text-lg font-semibold text-white">
          Prediction history
        </h2>

        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-12 bg-slate-800 rounded animate-pulse"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <p>No predictions yet</p>
            <Link
              href="/predictions/markets"
              className="mt-2 inline-block text-emerald-400 hover:text-emerald-300"
            >
              Browse markets and make your first prediction
            </Link>
          </div>
        ) : (
          <>
            <div className="divide-y divide-[#2d3748]">
              {items.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-gray-800/30"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/predictions/markets/${row.market_id}`}
                      className="font-medium text-white hover:text-emerald-400 truncate block"
                    >
                      {row.market_title}
                    </Link>
                    <p className="text-slate-400 text-sm mt-0.5">
                      {row.outcome_label} · confidence {row.confidence}/10
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <ShareButton
                      marketId={row.market_id}
                      title={row.market_title}
                      compact
                    />
                    <span className="text-emerald-400 font-medium">
                      +{row.xp_earned + row.bonus_xp} XP
                    </span>
                    {row.market_status === 'resolved' && (
                      <span className={row.is_correct ? 'text-emerald-400' : 'text-slate-500'}>
                        {row.is_correct ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                      </span>
                    )}
                    <span className="text-slate-500 text-sm whitespace-nowrap">
                      {formatDate(row.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[#2d3748] px-6 py-4">
                <p className="text-sm text-slate-400">
                  Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
