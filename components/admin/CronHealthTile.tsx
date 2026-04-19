'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Play, RefreshCw, AlertTriangle } from 'lucide-react'

/**
 * Admin-only at-a-glance view of every scheduled cron's last run + health
 * status. Pairs with /api/admin/cron-health (read) and either
 * /api/predictions/admin/run-agent (agent kind) or /api/admin/cron-run
 * (operational kind) for the per-row "Run now" buttons.
 *
 * Rows sort red → amber → green so failures are always at the top.
 * A red banner renders above the tile whenever any row is red.
 */

type CronKind = 'agent' | 'operational'

interface CronRow {
  agent: string
  schedule: string
  kind: CronKind
  description: string
  lastRun: string | null
  status: string
  error: string | null
  summary: string | null
  isHealthy: boolean
}

type Severity = 'red' | 'amber' | 'green'

function rowSeverity(row: CronRow): Severity {
  if (row.status === 'error') return 'red'
  if (row.isHealthy) return 'green'
  return 'amber'
}

function severityRank(s: Severity): number {
  if (s === 'red') return 0
  if (s === 'amber') return 1
  return 2
}

function relativeTime(iso: string | null): string {
  if (!iso) return 'never'
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return 'unknown'
  const deltaMs = Date.now() - t
  const min = Math.round(deltaMs / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 48) return `${hr}h ago`
  const d = Math.round(hr / 24)
  return `${d}d ago`
}

function StatusChip({ severity }: { severity: Severity }) {
  const styles: Record<Severity, string> = {
    red: 'bg-red-500/15 text-red-300 border border-red-500/30',
    amber: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
    green: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
  }
  const labels: Record<Severity, string> = {
    red: 'failing',
    amber: 'stale',
    green: 'ok',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${styles[severity]}`}>
      {labels[severity]}
    </span>
  )
}

export default function CronHealthTile() {
  const [rows, setRows] = useState<CronRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [running, setRunning] = useState<string | null>(null)
  const [runResults, setRunResults] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    try {
      setRefreshing(true)
      const res = await fetch('/api/admin/cron-health', { cache: 'no-store' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      const json = (await res.json()) as { agents: CronRow[] }
      setRows(json.agents)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const id = setInterval(() => void load(), 60_000)
    return () => clearInterval(id)
  }, [load])

  const sorted = useMemo(() => {
    if (!rows) return []
    return [...rows].sort((a, b) => {
      const sa = severityRank(rowSeverity(a))
      const sb = severityRank(rowSeverity(b))
      if (sa !== sb) return sa - sb
      return a.agent.localeCompare(b.agent)
    })
  }, [rows])

  const redCount = sorted.filter((r) => rowSeverity(r) === 'red').length

  const runJob = useCallback(
    async (row: CronRow) => {
      setRunning(row.agent)
      setRunResults((prev) => ({ ...prev, [row.agent]: 'running…' }))
      try {
        const url =
          row.kind === 'agent'
            ? '/api/predictions/admin/run-agent'
            : '/api/admin/cron-run'
        const body =
          row.kind === 'agent' ? { agent: row.agent } : { job: row.agent }

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await res.json().catch(() => ({}))
        const ok = res.ok && data.success !== false
        setRunResults((prev) => ({
          ...prev,
          [row.agent]: ok
            ? `ok · ${data.duration_ms ?? '?'}ms`
            : `error · ${data.error ?? `HTTP ${res.status}`}`,
        }))
        if (ok) void load()
      } catch (err) {
        setRunResults((prev) => ({
          ...prev,
          [row.agent]: err instanceof Error ? err.message : String(err),
        }))
      } finally {
        setRunning(null)
      }
    },
    [load]
  )

  return (
    <div className="w-full">
      {redCount > 0 && (
        <div
          role="alert"
          className="mb-3 flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          <span>
            <strong>{redCount}</strong> cron{redCount > 1 ? 's' : ''} failing. Check the health
            tile.
          </span>
        </div>
      )}

      <section className="w-full rounded-xl border border-slate-800 bg-[#1a2029]">
        <header className="flex items-center justify-between gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="flex items-center gap-2 text-left text-white"
            aria-expanded={!collapsed}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden />
            )}
            <span className="text-sm font-semibold">Cron health</span>
            {!loading && rows && (
              <span className="text-xs text-slate-500">
                {sorted.length} jobs · {redCount} failing
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => void load()}
            disabled={refreshing}
            className="inline-flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
            <span>{refreshing ? 'Refreshing' : 'Refresh'}</span>
          </button>
        </header>

        {!collapsed && (
          <div className="border-t border-slate-800">
            {loading && (
              <div className="px-4 py-6 text-sm text-slate-400">Loading…</div>
            )}
            {error && (
              <div className="px-4 py-3 text-sm text-red-300">Error: {error}</div>
            )}
            {!loading && !error && sorted.length === 0 && (
              <div className="px-4 py-6 text-sm text-slate-400">
                No cron data yet. Once at least one cron writes to
                <code className="mx-1 rounded bg-slate-800 px-1 py-0.5">cron_job_runs</code>
                this tile fills in.
              </div>
            )}
            {!loading && !error && sorted.length > 0 && (
              <ul className="divide-y divide-slate-800">
                {sorted.map((row) => {
                  const sev = rowSeverity(row)
                  const isRunning = running === row.agent
                  const result = runResults[row.agent]
                  return (
                    <li
                      key={row.agent}
                      className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">{row.agent}</span>
                          <StatusChip severity={sev} />
                          <span className="text-[10px] uppercase tracking-wider text-slate-500">
                            {row.kind}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                          <span className="font-mono">{row.schedule}</span>
                          <span>last: {relativeTime(row.lastRun)}</span>
                          <span>{row.description}</span>
                        </div>
                        {row.error && (
                          <p className="mt-1 truncate text-xs text-red-300" title={row.error}>
                            {row.error}
                          </p>
                        )}
                        {result && (
                          <p className="mt-1 text-xs text-slate-400">↳ {result}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => void runJob(row)}
                        disabled={isRunning}
                        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
                      >
                        <Play className="h-3 w-3" aria-hidden />
                        {isRunning ? 'Running…' : 'Run now'}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
