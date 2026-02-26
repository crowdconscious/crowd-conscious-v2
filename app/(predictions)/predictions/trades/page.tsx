'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Wallet, TrendingUp, TrendingDown, Heart } from 'lucide-react'

type HistoryItem = {
  id: string
  type: 'deposit' | 'trade'
  date: string
  amount: number
  status: string
  market_title?: string
  side?: string
}

type Stats = {
  totalDeposited: number
  totalWon: number
  totalLost: number
  consciousFundContributed: number
}

const PAGE_SIZE = 15

function formatCurrency(num: number): string {
  return `$${num.toFixed(2)}`
}

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
  const [items, setItems] = useState<HistoryItem[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)

  const fetchHistory = async (offset: number) => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/predictions/history?limit=${PAGE_SIZE}&offset=${offset}`
      )
      const data = await res.json()
      if (data.items) setItems(data.items)
      if (data.stats) setStats(data.stats)
      if (data.pagination?.total != null) setTotal(data.pagination.total)
    } catch (err) {
      console.error('Fetch history error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory(page * PAGE_SIZE)
  }, [page])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href="/predictions"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-emerald-400"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to dashboard
      </Link>

      <h1 className="text-2xl font-bold text-white">My Trades</h1>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
              <Wallet className="w-4 h-4" />
              Total Deposited
            </div>
            <p className="text-xl font-bold text-emerald-400">
              {formatCurrency(stats.totalDeposited)} MXN
            </p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
              <TrendingUp className="w-4 h-4" />
              Total Won
            </div>
            <p className="text-xl font-bold text-emerald-400">
              {formatCurrency(stats.totalWon)} MXN
            </p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
              <TrendingDown className="w-4 h-4" />
              Total Lost
            </div>
            <p className="text-xl font-bold text-red-400">
              {formatCurrency(stats.totalLost)} MXN
            </p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
              <Heart className="w-4 h-4" />
              Conscious Fund
            </div>
            <p className="text-xl font-bold text-amber-400">
              {formatCurrency(stats.consciousFundContributed)} MXN
            </p>
          </div>
        </div>
      )}

      {/* Transaction history table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <h2 className="text-lg font-semibold text-white px-6 py-4 border-b border-slate-800">
          Transaction History
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
            <p>No transactions yet</p>
            <Link
              href="/predictions/wallet"
              className="mt-2 inline-block text-emerald-400 hover:text-emerald-300"
            >
              Deposit funds
            </Link>
            {' or '}
            <Link
              href="/predictions/markets"
              className="text-emerald-400 hover:text-emerald-300"
            >
              trade on markets
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">
                      Date
                    </th>
                    <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">
                      Type
                    </th>
                    <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">
                      Details
                    </th>
                    <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">
                      Amount
                    </th>
                    <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr
                      key={`${row.type}-${row.id}`}
                      className="border-b border-slate-800/50 hover:bg-slate-800/30"
                    >
                      <td className="px-6 py-4 text-sm text-slate-300 whitespace-nowrap">
                        {formatDate(row.date)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                            row.type === 'deposit'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-emerald-500/20 text-emerald-400'
                          }`}
                        >
                          {row.type === 'deposit' ? 'Deposit' : 'Trade'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">
                        {row.type === 'deposit'
                          ? 'Wallet deposit'
                          : `${row.side?.toUpperCase()} — ${row.market_title ?? 'Market'}`
                        }
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-medium text-white">
                        {row.type === 'deposit' ? '+' : ''}
                        {formatCurrency(row.amount)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-xs font-medium ${
                            row.status === 'completed' || row.status === 'filled'
                              ? 'text-emerald-400'
                              : row.status === 'failed' || row.status === 'cancelled'
                                ? 'text-red-400'
                                : 'text-amber-400'
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800">
                <p className="text-sm text-slate-400">
                  Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of{' '}
                  {total}
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
