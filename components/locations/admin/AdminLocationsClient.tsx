'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { LOCATION_CATEGORY_FORM_OPTIONS } from '@/lib/locations/categories'

const LIST_BASE = '/predictions/admin/locations'

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

  const selectClass =
    'rounded-lg border border-cc-border bg-cc-card px-3 py-2 text-sm text-cc-text-primary focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Conscious Locations</h1>
          <p className="mt-1 text-sm text-cc-text-secondary">
            Manage certified venues, brands, and influencers
          </p>
        </div>
        <Link
          href={`${LIST_BASE}/new`}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          + Agregar
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className={selectClass}
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
          className={selectClass}
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
          className={selectClass}
        >
          <option value="all">All categories</option>
          {LOCATION_CATEGORY_FORM_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.value}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {loading && <p className="text-cc-text-secondary">Loading…</p>}

      <div className="space-y-3">
        {filtered.map((l) => (
          <div
            key={l.id}
            className="flex flex-col gap-2 rounded-xl border border-cc-border bg-[#1a2029] p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium text-cc-text-primary">
                {statusDot(l.status)} {l.name} · {l.neighborhood || '—'} · {l.category}
              </p>
              <p className="text-sm text-cc-text-secondary">
                Score:{' '}
                {l.conscious_score != null ? `${l.conscious_score}/10` : '—'} · {l.total_votes ?? 0}{' '}
                votos · {l.status}
                {l.conscious_score == null && (l.total_votes ?? 0) < 10 && (
                  <span className="text-amber-400"> (min. 10 votos)</span>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`${LIST_BASE}/${l.id}/edit`}
                className="rounded-lg border border-cc-border px-3 py-1.5 text-sm text-emerald-400 hover:bg-emerald-500/10"
              >
                Editar
              </Link>
              {l.current_market_id && (
                <Link
                  href={`/predictions/markets/${l.current_market_id}`}
                  className="rounded-lg border border-cc-border px-3 py-1.5 text-sm text-cc-text-secondary hover:bg-cc-card"
                >
                  Ver mercado
                </Link>
              )}
              {l.status === 'active' && (
                <button
                  type="button"
                  disabled={pausingId === l.id}
                  onClick={() => pause(l.id)}
                  className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-sm text-amber-200"
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
