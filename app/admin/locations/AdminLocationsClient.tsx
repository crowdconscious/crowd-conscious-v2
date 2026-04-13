'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

type Loc = {
  id: string
  name: string
  slug: string
  city: string
  neighborhood: string | null
  category: string
  status: string
  conscious_score: number | null
  total_votes: number
  current_market_id: string | null
}

export default function AdminLocationsClient() {
  const [locations, setLocations] = useState<Loc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterCity, setFilterCity] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [pausingId, setPausingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/locations')
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Failed to load')
        setLocations([])
        return
      }
      setLocations(json.locations ?? [])
    } catch {
      setError('Failed to load')
      setLocations([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const cities = useMemo(() => {
    const s = new Set<string>()
    for (const l of locations) s.add(l.city)
    return ['all', ...[...s].sort()]
  }, [locations])

  const filtered = useMemo(() => {
    return locations.filter((l) => {
      if (filterStatus !== 'all' && l.status !== filterStatus) return false
      if (filterCity !== 'all' && l.city !== filterCity) return false
      if (filterCategory !== 'all' && l.category !== filterCategory) return false
      return true
    })
  }, [locations, filterStatus, filterCity, filterCategory])

  const pause = async (id: string) => {
    if (!confirm('¿Suspender esta ubicación?')) return
    setPausingId(id)
    try {
      const res = await fetch(`/api/admin/locations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'suspended' }),
      })
      if (!res.ok) {
        const j = await res.json()
        alert(j.error || 'Error')
        return
      }
      await load()
    } finally {
      setPausingId(null)
    }
  }

  const statusDot = (s: string) => {
    if (s === 'active') return '🟢'
    if (s === 'pending') return '🟡'
    if (s === 'suspended' || s === 'revoked') return '🔴'
    return '⚪'
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Conscious Locations</h1>
        <Link
          href="/admin/locations/new"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          + Agregar
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="all">All status</option>
          <option value="pending">pending</option>
          <option value="active">active</option>
          <option value="under_review">under_review</option>
          <option value="suspended">suspended</option>
          <option value="revoked">revoked</option>
        </select>
        <select
          value={filterCity}
          onChange={(e) => setFilterCity(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          {cities.map((c) => (
            <option key={c} value={c}>
              {c === 'all' ? 'All cities' : c}
            </option>
          ))}
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="all">All categories</option>
          <option value="restaurant">restaurant</option>
          <option value="bar">bar</option>
          <option value="cafe">cafe</option>
          <option value="hotel">hotel</option>
          <option value="brand">brand</option>
          <option value="other">other</option>
        </select>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {loading && <p className="text-slate-500">Loading…</p>}

      <div className="space-y-3">
        {filtered.map((l) => (
          <div
            key={l.id}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium text-slate-900">
                {statusDot(l.status)} {l.name} · {l.neighborhood || '—'} · {l.category}
              </p>
              <p className="text-sm text-slate-600">
                Score:{' '}
                {l.conscious_score != null ? `${l.conscious_score}/10` : '—'} · {l.total_votes ?? 0} votos ·{' '}
                {l.status}
                {l.conscious_score == null && (l.total_votes ?? 0) < 10 && (
                  <span className="text-amber-700"> (min. 10 votos)</span>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/admin/locations/${l.id}`}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-50"
              >
                Editar
              </Link>
              {l.current_market_id && (
                <Link
                  href={`/predictions/markets/${l.current_market_id}`}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-50"
                >
                  Ver mercado
                </Link>
              )}
              {l.status === 'active' && (
                <button
                  type="button"
                  disabled={pausingId === l.id}
                  onClick={() => pause(l.id)}
                  className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm text-amber-900"
                >
                  Pausar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
