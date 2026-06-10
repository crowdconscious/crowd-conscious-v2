'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

const LIST_BASE = '/predictions/admin/creators'

type CreatorRow = {
  id: string
  profile_id: string
  status: string
  conscious_score: number | null
  total_votes: number
  certified_at: string | null
  craft: string | null
  city: string | null
  current_market_id: string | null
  is_featured: boolean
  profile: {
    id: string
    handle: string | null
    full_name: string | null
    avatar_url: string | null
  } | null
}

export default function AdminCreatorsClient() {
  const [creators, setCreators] = useState<CreatorRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/creators')
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Failed to load')
        setCreators([])
        return
      }
      setCreators(json.creators ?? [])
    } catch {
      setError('Failed to load')
      setCreators([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    return creators.filter((c) => {
      if (filterStatus !== 'all' && c.status !== filterStatus) return false
      return true
    })
  }, [creators, filterStatus])

  const patch = async (id: string, body: Record<string, unknown>, confirmMsg?: string) => {
    if (confirmMsg && !confirm(confirmMsg)) return
    setBusyId(id)
    try {
      const res = await fetch(`/api/admin/creators/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const j = await res.json()
        alert(j.error || 'Error')
        return
      }
      await load()
    } finally {
      setBusyId(null)
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
          <h1 className="text-2xl font-bold text-white">Conscious Creators</h1>
          <p className="mt-1 text-sm text-cc-text-secondary">
            Certificaciones de creadores: nominados, verificados y certificados
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
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {loading && <p className="text-cc-text-secondary">Loading…</p>}

      <div className="space-y-3">
        {filtered.map((c) => {
          const name = c.profile?.full_name || `@${c.profile?.handle ?? '—'}`
          return (
            <div
              key={c.id}
              className="flex flex-col gap-2 rounded-xl border border-cc-border bg-[#1a2029] p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-cc-text-primary">
                  {statusDot(c.status)} {name}
                  {c.profile?.handle ? ` · @${c.profile.handle}` : ''}
                  {c.craft ? ` · ${c.craft}` : ''}
                </p>
                <p className="text-sm text-cc-text-secondary">
                  Score: {c.conscious_score != null ? `${c.conscious_score}/10` : '—'} ·{' '}
                  {c.total_votes ?? 0} votos · {c.status}
                  {c.certified_at
                    ? ` · certificado ${new Date(c.certified_at).toLocaleDateString('es-MX')}`
                    : ' · sin certificar'}
                  {c.conscious_score == null && (c.total_votes ?? 0) < 10 && (
                    <span className="text-amber-400"> (min. 10 votos)</span>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`${LIST_BASE}/${c.id}/edit`}
                  className="rounded-lg border border-cc-border px-3 py-1.5 text-sm text-emerald-400 hover:bg-emerald-500/10"
                >
                  Editar
                </Link>
                {c.profile?.handle && (
                  <Link
                    href={`/creators/${c.profile.handle}`}
                    className="rounded-lg border border-cc-border px-3 py-1.5 text-sm text-cc-text-secondary hover:bg-cc-card"
                  >
                    Ver perfil
                  </Link>
                )}
                {c.current_market_id && (
                  <Link
                    href={`/predictions/markets/${c.current_market_id}`}
                    className="rounded-lg border border-cc-border px-3 py-1.5 text-sm text-cc-text-secondary hover:bg-cc-card"
                  >
                    Ver votación
                  </Link>
                )}
                {!c.certified_at && (
                  <button
                    type="button"
                    disabled={busyId === c.id}
                    onClick={() =>
                      void patch(
                        c.id,
                        { certify: true },
                        `¿Certificar a ${name} como Creador Consciente? Activa el sello dorado y agenda revisión en 90 días.`
                      )
                    }
                    className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-sm text-emerald-300"
                  >
                    Certificar
                  </button>
                )}
                {c.status === 'active' && (
                  <button
                    type="button"
                    disabled={busyId === c.id}
                    onClick={() =>
                      void patch(c.id, { status: 'suspended' }, '¿Suspender esta certificación?')
                    }
                    className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-sm text-amber-200"
                  >
                    Pausar
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
