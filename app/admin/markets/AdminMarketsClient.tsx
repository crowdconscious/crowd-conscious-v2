'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'

type Row = {
  id: string
  title: string
  category: string | null
  status: string
  sponsor_name: string | null
  sponsor_logo_url: string | null
  sponsor_url: string | null
  sponsor_type: string | null
  sponsor_contribution: number | null
  archived_at: string | null
}

export default function AdminMarketsClient() {
  const [showArchived, setShowArchived] = useState(false)
  const [markets, setMarkets] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [archivingId, setArchivingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    let q = supabase
      .from('prediction_markets')
      .select(
        'id, title, category, status, sponsor_name, sponsor_logo_url, sponsor_url, sponsor_type, sponsor_contribution, archived_at'
      )
      .order('created_at', { ascending: false })
    if (!showArchived) q = q.is('archived_at', null)
    const { data, error: err } = await q
    if (err) {
      setError(err.message)
      setMarkets([])
    } else {
      setMarkets((data ?? []) as Row[])
    }
    setLoading(false)
  }, [showArchived])

  useEffect(() => {
    load()
  }, [load])

  const archiveItem = async (id: string) => {
    setArchivingId(id)
    try {
      const res = await fetch('/api/predictions/admin/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resource: 'market', id }),
      })
      const j = await res.json()
      if (!res.ok) {
        alert(j.error || 'Failed to archive')
        return
      }
      await load()
    } finally {
      setArchivingId(null)
    }
  }

  const archivedInView = markets.filter((m) => m.archived_at).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Prediction Markets</h1>
        <Link
          href="/predictions/admin/resolve"
          className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500"
        >
          Resolve Markets
        </Link>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <label className="flex items-center gap-2 text-gray-500 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="accent-emerald-500"
          />
          Show archived
        </label>
        {showArchived && (
          <span className="text-gray-500 text-xs">({archivedInView} archived)</span>
        )}
      </div>

      {error && (
        <p className="text-red-600 text-sm">Error loading markets: {error}</p>
      )}

      {loading ? (
        <p className="text-slate-500 text-sm">Loading…</p>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">Title</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">Category</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">Status</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">Sponsor</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(markets || []).map((m) => (
                <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm text-slate-900 max-w-xs truncate">{m.title}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{m.category}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        m.status === 'resolved'
                          ? 'bg-slate-200 text-slate-700'
                          : m.status === 'active' || m.status === 'trading'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {m.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{m.sponsor_name || '—'}</td>
                  <td className="px-4 py-3 space-x-3">
                    <Link
                      href={`/admin/markets/${m.id}`}
                      className="text-emerald-600 hover:text-emerald-500 text-sm font-medium"
                    >
                      Edit
                    </Link>
                    {!m.archived_at && (
                      <button
                        type="button"
                        onClick={() => archiveItem(m.id)}
                        disabled={archivingId === m.id}
                        className="text-gray-500 hover:text-gray-700 text-xs disabled:opacity-50"
                      >
                        {archivingId === m.id ? '…' : '📦 Archive'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
