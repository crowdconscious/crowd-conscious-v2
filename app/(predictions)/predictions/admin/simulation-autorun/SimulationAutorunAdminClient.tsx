'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import Link from 'next/link'

type DivergenceCell = {
  score: number | null
  realVoteCount: number
  hasRealData: boolean
  outcome: string
  computedAt: string
}

type AutorunRow = {
  id: string
  marketId: string
  title: string
  pulseStatus: string | null
  category: string | null
  status: string
  source: string
  simulationRunId: string | null
  attempts: number
  maxAttempts: number
  lastError: string | null
  costUsd: number | null
  updatedAt: string
  divergence: DivergenceCell | null
}

function statusLabel(status: string): string {
  switch (status) {
    case 'queued':
      return 'queued'
    case 'running':
      return 'running'
    case 'complete':
      return 'done'
    case 'failed':
      return 'failed'
    default:
      return status
  }
}

function formatDivergence(div: DivergenceCell | null): string {
  if (!div) return '—'
  if (!div.hasRealData || div.outcome === 'no_real_data') return '—'
  if (div.score == null || !Number.isFinite(div.score)) return '—'
  return div.score.toFixed(1)
}

export default function SimulationAutorunAdminClient() {
  const [rows, setRows] = useState<AutorunRow[]>([])
  const [enabled, setEnabled] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [pending, startTransition] = useTransition()
  const [rerunning, setRerunning] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch('/api/predictions/admin/simulation-autorun', {
        credentials: 'same-origin',
      })
      const data = (await res.json()) as {
        ok?: boolean
        enabled?: boolean
        rows?: AutorunRow[]
        error?: string
      }
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`)
        return
      }
      setEnabled(Boolean(data.enabled))
      setRows(data.rows ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    startTransition(() => {
      void load()
    })
  }, [load])

  async function onRerun(marketId: string) {
    setRerunning(marketId)
    setError(null)
    try {
      const res = await fetch('/api/predictions/admin/simulation-autorun', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketId }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`)
        return
      }
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setRerunning(null)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">
            Simulación auto-run
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Estado por Pulse: cola, corrida, divergencia al cerrar. Re-run
            encola de nuevo (idempotente por Pulse).
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span
            className={`rounded px-2 py-1 ${
              enabled
                ? 'bg-emerald-900/40 text-emerald-300'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            SIM_AUTORUN_ENABLED={enabled ? 'true' : 'false'}
          </span>
          <button
            type="button"
            onClick={() => {
              setLoading(true)
              void load()
            }}
            disabled={pending || loading}
            className="rounded border border-slate-700 px-3 py-1.5 text-slate-200 hover:bg-slate-800 disabled:opacity-50"
          >
            Actualizar
          </button>
        </div>
      </div>

      {error ? (
        <p className="mb-4 rounded border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-400">Cargando…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-400">
          No hay jobs aún. Publica un Pulse con el flag activo, o espera al
          backfill del cron.
        </p>
      ) : (
        <div className="overflow-x-auto rounded border border-slate-800">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-900/60 text-slate-400">
              <tr>
                <th className="px-3 py-2 font-medium">Pulse</th>
                <th className="px-3 py-2 font-medium">Auto-run</th>
                <th className="px-3 py-2 font-medium">Fuente</th>
                <th className="px-3 py-2 font-medium">Divergencia</th>
                <th className="px-3 py-2 font-medium">n real</th>
                <th className="px-3 py-2 font-medium">Costo</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-slate-800/80 align-top"
                >
                  <td className="px-3 py-2">
                    <div className="max-w-xs truncate font-medium text-slate-100">
                      {row.title}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {row.category ?? '—'} · {row.pulseStatus ?? '—'}
                    </div>
                    {row.simulationRunId ? (
                      <Link
                        href={`/pulse/${row.marketId}/simulacion?runId=${row.simulationRunId}`}
                        className="mt-1 inline-block text-xs text-amber-400 hover:underline"
                      >
                        Ver simulación
                      </Link>
                    ) : null}
                    {row.lastError && row.status === 'failed' ? (
                      <div className="mt-1 max-w-xs truncate text-xs text-red-400">
                        {row.lastError}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <span className="font-mono text-slate-200">
                      {statusLabel(row.status)}
                    </span>
                    <div className="text-xs text-slate-500">
                      {row.attempts}/{row.maxAttempts}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-slate-400">{row.source}</td>
                  <td className="px-3 py-2 font-mono text-slate-200">
                    {formatDivergence(row.divergence)}
                    {row.divergence && !row.divergence.hasRealData ? (
                      <div className="text-xs text-slate-500">sin datos reales</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-slate-300">
                    {row.divergence ? row.divergence.realVoteCount : '—'}
                  </td>
                  <td className="px-3 py-2 text-slate-400">
                    {row.costUsd != null ? `$${row.costUsd.toFixed(3)}` : '—'}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      disabled={!enabled || rerunning === row.marketId}
                      onClick={() => void onRerun(row.marketId)}
                      className="rounded border border-amber-700/50 px-2 py-1 text-xs text-amber-300 hover:bg-amber-950/40 disabled:opacity-40"
                    >
                      {rerunning === row.marketId ? '…' : 'Re-run'}
                    </button>
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
