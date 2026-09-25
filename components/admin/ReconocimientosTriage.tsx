'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  HOW_KNOWN_LABELS_ES,
  WHO_TYPE_LABELS_ES,
  type HowKnown,
  type RecognitionStatus,
  type WhoType,
} from '@/lib/reconocimientos/constants'
import type { RecognitionRow } from '@/lib/reconocimientos/types'

const STATUSES: Array<RecognitionStatus | 'all'> = [
  'all',
  'pending',
  'approved',
  'rejected',
]

type EventCount = {
  recognition_id: string
  event_type: string
  count: number
}

type WeeklyRow = {
  week_start: string
  src: string | null
  status: string | null
  submissions: number
  event_type: string | null
  events: number
}

export default function ReconocimientosTriage() {
  const [status, setStatus] = useState<RecognitionStatus | 'all'>('pending')
  const [src, setSrc] = useState('')
  const [items, setItems] = useState<RecognitionRow[]>([])
  const [eventCounts, setEventCounts] = useState<EventCount[]>([])
  const [weekly, setWeekly] = useState<WeeklyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const q = new URLSearchParams()
      if (status !== 'all') q.set('status', status)
      if (src.trim()) q.set('src', src.trim())
      const res = await fetch(`/api/admin/reconocimientos?${q.toString()}`)
      const data = (await res.json().catch(() => null)) as {
        items?: RecognitionRow[]
        eventCounts?: EventCount[]
        weekly?: WeeklyRow[]
        error?: string
      } | null
      if (!res.ok) {
        setError(data?.error ?? 'Error al cargar')
        setItems([])
        return
      }
      setItems(data?.items ?? [])
      setEventCounts(data?.eventCounts ?? [])
      setWeekly(data?.weekly ?? [])
    } catch {
      setError('Error de red')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [status, src])

  useEffect(() => {
    void load()
  }, [load])

  async function act(id: string, action: 'approve' | 'reject') {
    setBusyId(id)
    setError(null)
    try {
      const body: { action: 'approve' | 'reject'; reject_reason?: string } = {
        action,
      }
      if (action === 'reject') {
        const reason = rejectReasons[id]?.trim()
        if (reason) body.reject_reason = reason
      }
      const res = await fetch(`/api/admin/reconocimientos/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string
        } | null
        setError(data?.error ?? 'No se pudo actualizar')
        return
      }
      await load()
    } catch {
      setError('Error de red')
    } finally {
      setBusyId(null)
    }
  }

  function eventsFor(id: string): string {
    const rows = eventCounts.filter((e) => e.recognition_id === id)
    if (rows.length === 0) return ''
    return rows.map((r) => `${r.event_type}:${r.count}`).join(' · ')
  }

  return (
    <div>
      {weekly.length > 0 && (
        <div className="mb-6 overflow-x-auto rounded-xl border border-slate-800 bg-[#151c26] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Métricas internas (semanal)
          </p>
          <table className="mt-3 w-full min-w-[520px] text-left text-xs text-slate-400">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500">
                <th className="py-1 pr-3 font-medium">Semana</th>
                <th className="py-1 pr-3 font-medium">src</th>
                <th className="py-1 pr-3 font-medium">status</th>
                <th className="py-1 pr-3 font-medium">envíos</th>
                <th className="py-1 pr-3 font-medium">evento</th>
                <th className="py-1 font-medium">n</th>
              </tr>
            </thead>
            <tbody>
              {weekly.slice(0, 12).map((w, i) => (
                <tr
                  key={`${w.week_start}-${w.src}-${w.status}-${w.event_type}-${i}`}
                  className="border-b border-slate-800/60"
                >
                  <td className="py-1 pr-3">{w.week_start}</td>
                  <td className="py-1 pr-3">{w.src ?? '—'}</td>
                  <td className="py-1 pr-3">{w.status ?? '—'}</td>
                  <td className="py-1 pr-3">{w.submissions}</td>
                  <td className="py-1 pr-3">{w.event_type ?? '—'}</td>
                  <td className="py-1">{w.events}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-400">
            Estado
          </label>
          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as RecognitionStatus | 'all')
            }
            className="mt-1 rounded-lg border border-slate-700 bg-[#151c26] px-3 py-2 text-sm text-slate-100"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === 'all' ? 'Todos' : s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400">Src</label>
          <input
            type="text"
            value={src}
            onChange={(e) => setSrc(e.target.value)}
            placeholder="web, ios…"
            className="mt-1 w-32 rounded-lg border border-slate-700 bg-[#151c26] px-3 py-2 text-sm text-slate-100"
          />
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:border-emerald-500/40 hover:text-emerald-300"
        >
          Actualizar
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-500">Sin resultados.</p>
      ) : (
        <ul className="space-y-4">
          {items.map((item) => {
            const who =
              WHO_TYPE_LABELS_ES[item.who_type as WhoType] ?? item.who_type
            const how =
              HOW_KNOWN_LABELS_ES[item.how_known as HowKnown] ?? item.how_known
            const busy = busyId === item.id
            const metrics = eventsFor(item.id)

            return (
              <li
                key={item.id}
                className="overflow-hidden rounded-2xl border border-slate-800 bg-[#151c26]"
              >
                <div className="flex flex-col sm:flex-row">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/admin/reconocimientos/${item.id}/photo`}
                    alt=""
                    className="h-48 w-full shrink-0 object-cover sm:h-auto sm:w-44"
                  />
                  <div className="flex-1 p-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={
                          item.status === 'approved'
                            ? 'text-emerald-400'
                            : item.status === 'rejected'
                              ? 'text-red-400'
                              : 'text-amber-400'
                        }
                      >
                        {item.status}
                      </span>
                      <span className="text-slate-600">·</span>
                      <span className="text-slate-500">src={item.src}</span>
                      <span className="text-slate-600">·</span>
                      <span className="text-slate-500">
                        {new Date(item.created_at).toLocaleString('es-MX')}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-white">
                      {item.what}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {item.where_text} · {who} · {how}
                    </p>
                    {item.credit_handle && (
                      <p className="mt-1 text-xs text-slate-500">
                        crédito: @{item.credit_handle}
                      </p>
                    )}
                    {item.contact && (
                      <p className="mt-1 text-xs text-slate-500">
                        contacto: {item.contact}
                      </p>
                    )}
                    {metrics && (
                      <p className="mt-1 text-xs text-slate-500">
                        eventos: {metrics}
                      </p>
                    )}
                    {item.reject_reason && (
                      <p className="mt-1 text-xs text-red-400/80">
                        rechazo: {item.reject_reason}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {item.status !== 'approved' && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void act(item.id, 'approve')}
                          className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-[#0f1419] hover:bg-emerald-400 disabled:opacity-50"
                        >
                          Aprobar
                        </button>
                      )}
                      {item.status !== 'rejected' && (
                        <>
                          <input
                            type="text"
                            value={rejectReasons[item.id] ?? ''}
                            onChange={(e) =>
                              setRejectReasons((prev) => ({
                                ...prev,
                                [item.id]: e.target.value,
                              }))
                            }
                            placeholder="Motivo (opcional)"
                            className="w-40 rounded-lg border border-slate-700 bg-[#0f1419] px-2 py-1.5 text-xs text-slate-200"
                          />
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void act(item.id, 'reject')}
                            className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                          >
                            Rechazar
                          </button>
                        </>
                      )}
                      {item.status === 'approved' && (
                        <>
                          <a
                            href={`/api/reconocimientos/${item.share_slug}/card?format=portrait&dl=1`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-emerald-500/40 hover:text-emerald-300"
                          >
                            Card portrait
                          </a>
                          <a
                            href={`/api/reconocimientos/${item.share_slug}/card?format=story&dl=1`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-emerald-500/40 hover:text-emerald-300"
                          >
                            Card story
                          </a>
                          <a
                            href={`/reconocimientos/${item.share_slug}?src=share`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-emerald-500/40 hover:text-emerald-300"
                          >
                            Ver público
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
