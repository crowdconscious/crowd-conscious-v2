'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ExternalLink, Play, RefreshCw, Target } from 'lucide-react'

/**
 * Per-market runner card for the Sponsor Pulse Report agent.
 *
 * Replaces the previous `window.prompt()` UUID-paste flow for this agent:
 * admins now pick a Pulse from a dropdown, see whether a cached report
 * already exists, run the agent against it, and inspect the resulting
 * executive summary + dashboard link inline. No more "I ran it but
 * where's the output?" — the agent's narrative is shown right in the
 * card and a link jumps straight into the full sponsor dashboard view.
 */

type PulseMarket = {
  id: string
  title: string
  status: string
  isDraft: boolean
  totalVotes: number
  sponsorName: string | null
  sponsorAccountId: string | null
  pulseClientEmail: string | null
  resolutionDate: string | null
  createdAt: string
}

type ReportSnapshot = {
  totalVotes?: number
  registeredVotes?: number
  guestVotes?: number
  avgConfidence?: number | string
  outcomes?: Array<{
    id?: string
    label?: string
    votes?: number
    pct?: number
    avgConfidence?: number | string
  }>
}

type CachedReport = {
  id: string
  executiveSummary: string | null
  convictionAnalysis: string | null
  nextSteps: unknown[]
  snapshot: ReportSnapshot | null
  generatedAt: string
  model: string | null
  tokensIn: number
  tokensOut: number
  cost: number
  pdfPath: string | null
  pdfGeneratedAt: string | null
  emailSentAt: string | null
}

type ReportResponse = {
  market: { id: string; title: string; status: string }
  report: CachedReport | null
  dashboardUrl: string | null
}

interface Props {
  parentBusy: boolean
  onAfterRun: () => Promise<void> | void
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return iso
  }
}

function statusBadge(status: string, isDraft: boolean) {
  if (isDraft) {
    return 'Draft'
  }
  if (status === 'resolved') return 'Resolved'
  if (status === 'active') return 'Active'
  return status
}

export default function SponsorPulseReportRunner({ parentBusy, onAfterRun }: Props) {
  const [markets, setMarkets] = useState<PulseMarket[]>([])
  const [marketsLoading, setMarketsLoading] = useState(true)
  const [marketsError, setMarketsError] = useState<string | null>(null)
  const [marketId, setMarketId] = useState<string>('')

  const [report, setReport] = useState<ReportResponse | null>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)

  const [running, setRunning] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)
  const [runOk, setRunOk] = useState<string | null>(null)

  // Load Pulse markets once.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/predictions/admin/pulse-markets-list')
        const json = (await res.json().catch(() => ({}))) as {
          markets?: PulseMarket[]
          error?: string
        }
        if (cancelled) return
        if (!res.ok) {
          throw new Error(json.error ?? `Failed to load markets (${res.status})`)
        }
        setMarkets(json.markets ?? [])
      } catch (e) {
        if (cancelled) return
        setMarketsError(e instanceof Error ? e.message : 'Failed to load markets')
      } finally {
        if (!cancelled) setMarketsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // When the admin picks a market, automatically peek at any cached report.
  useEffect(() => {
    if (!marketId) {
      setReport(null)
      setReportError(null)
      return
    }
    let cancelled = false
    setReportLoading(true)
    setReportError(null)
    setRunOk(null)
    setRunError(null)
    ;(async () => {
      try {
        const res = await fetch(
          `/api/predictions/admin/sponsor-pulse-report/${encodeURIComponent(marketId)}`
        )
        const json = (await res.json().catch(() => ({}))) as ReportResponse & { error?: string }
        if (cancelled) return
        if (!res.ok) {
          throw new Error(json.error ?? `Failed to load report (${res.status})`)
        }
        setReport(json)
      } catch (e) {
        if (cancelled) return
        setReportError(e instanceof Error ? e.message : 'Failed to load report')
        setReport(null)
      } finally {
        if (!cancelled) setReportLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [marketId])

  // Group dropdown options so the admin can scan them at a glance:
  // "needs report" Pulses (active/resolved with votes) bubble up first,
  // then drafts, sorted within each bucket by recency.
  const groupedOptions = useMemo(() => {
    const liveResolved = markets.filter((m) => !m.isDraft && m.status === 'resolved')
    const liveActive = markets.filter((m) => !m.isDraft && m.status === 'active')
    const drafts = markets.filter((m) => m.isDraft)
    const other = markets.filter(
      (m) => !m.isDraft && m.status !== 'resolved' && m.status !== 'active'
    )
    return { liveResolved, liveActive, drafts, other }
  }, [markets])

  const selectedMarket = useMemo(
    () => markets.find((m) => m.id === marketId) ?? null,
    [markets, marketId]
  )

  async function runNow() {
    if (!marketId || running || parentBusy) return
    setRunning(true)
    setRunError(null)
    setRunOk(null)
    try {
      const res = await fetch('/api/predictions/admin/run-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: 'sponsor-pulse-report', marketId }),
      })
      let json: { error?: string; result?: { summary?: Record<string, unknown> } } = {}
      try {
        json = await res.json()
      } catch {
        throw new Error(
          `Run failed (status ${res.status}). Response was not JSON — likely a Vercel timeout. The agent may still be finishing in the background; refresh in ~30s.`
        )
      }
      if (!res.ok) {
        throw new Error(json.error ?? `Run failed (${res.status})`)
      }
      setRunOk('Agent finished — reloading report…')
      // Refresh both the parent agents list (cost stats) and the cached report.
      await onAfterRun()
      const reportRes = await fetch(
        `/api/predictions/admin/sponsor-pulse-report/${encodeURIComponent(marketId)}`
      )
      if (reportRes.ok) {
        setReport((await reportRes.json()) as ReportResponse)
      }
      setRunOk('Done.')
      setTimeout(() => setRunOk(null), 4000)
    } catch (e) {
      setRunError(e instanceof Error ? e.message : 'Run failed')
    } finally {
      setRunning(false)
    }
  }

  const cached = report?.report ?? null
  const dashboardUrl = report?.dashboardUrl ?? null
  const nextStepsList = useMemo<string[]>(() => {
    if (!cached) return []
    const arr = cached.nextSteps
    if (!Array.isArray(arr)) return []
    return arr.map((step) => {
      if (typeof step === 'string') return step
      if (step && typeof step === 'object') {
        const s = step as Record<string, unknown>
        if (typeof s.text === 'string') return s.text
        if (typeof s.label === 'string') return s.label
        if (typeof s.title === 'string') return s.title
      }
      return JSON.stringify(step)
    })
  }, [cached])

  const disabled = running || parentBusy || !marketId

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-3 md:col-span-2 lg:col-span-3">
      <div className="flex items-center gap-2">
        <Target className="w-5 h-5 text-slate-400" />
        <span className="font-medium text-white">Sponsor Pulse Report (per market)</span>
        <span
          className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30"
          title="No automatic schedule — runs only via Run Now"
        >
          Manual
        </span>
      </div>

      <div className="text-xs text-slate-500">
        Genera el informe ejecutivo por Pulse (resumen, análisis de convicción, próximos pasos)
        y lo cachea en <code>sponsor_pulse_reports</code>. El sponsor lo verá en su dashboard
        y como PDF. Una corrida re-genera y sobre-escribe la versión anterior.
      </div>

      <div className="grid md:grid-cols-[1fr_auto] gap-2 items-start">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Pulse market</label>
          {marketsLoading ? (
            <div className="text-sm text-slate-500">Loading Pulses…</div>
          ) : marketsError ? (
            <div className="text-sm text-red-400">{marketsError}</div>
          ) : (
            <select
              value={marketId}
              onChange={(e) => setMarketId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">— Selecciona un Pulse —</option>
              {groupedOptions.liveResolved.length > 0 && (
                <optgroup label="Resolved (Pulses listos para reporte)">
                  {groupedOptions.liveResolved.map((m) => (
                    <option key={m.id} value={m.id}>
                      {`${m.title} · ${m.totalVotes} votos${m.sponsorName ? ` · ${m.sponsorName}` : ''}`}
                    </option>
                  ))}
                </optgroup>
              )}
              {groupedOptions.liveActive.length > 0 && (
                <optgroup label="Active (vista previa, todavía votando)">
                  {groupedOptions.liveActive.map((m) => (
                    <option key={m.id} value={m.id}>
                      {`${m.title} · ${m.totalVotes} votos${m.sponsorName ? ` · ${m.sponsorName}` : ''}`}
                    </option>
                  ))}
                </optgroup>
              )}
              {groupedOptions.drafts.length > 0 && (
                <optgroup label="Drafts">
                  {groupedOptions.drafts.map((m) => (
                    <option key={m.id} value={m.id}>
                      {`${m.title} · draft${m.sponsorName ? ` · ${m.sponsorName}` : ''}`}
                    </option>
                  ))}
                </optgroup>
              )}
              {groupedOptions.other.length > 0 && (
                <optgroup label="Otros">
                  {groupedOptions.other.map((m) => (
                    <option key={m.id} value={m.id}>
                      {`${m.title} · ${m.status}`}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          )}
          {selectedMarket && (
            <div className="mt-1 text-[11px] text-slate-500 flex flex-wrap gap-2">
              <span>UUID: <code className="text-slate-400">{selectedMarket.id}</code></span>
              <span>Status: {statusBadge(selectedMarket.status, selectedMarket.isDraft)}</span>
              {selectedMarket.resolutionDate && (
                <span>Cierre: {formatDateTime(selectedMarket.resolutionDate)}</span>
              )}
            </div>
          )}
        </div>
        <div className="flex md:flex-col gap-2 md:pt-5">
          <button
            onClick={runNow}
            disabled={disabled}
            className="flex items-center justify-center gap-2 py-2 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors"
          >
            <Play className="w-4 h-4" />
            {running ? 'Running…' : 'Run Now'}
          </button>
          {dashboardUrl && (
            <Link
              href={dashboardUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 py-2 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm text-white transition-colors"
              title="Abrir el dashboard del sponsor (token-protegido)"
            >
              <ExternalLink className="w-4 h-4" />
              Open dashboard
            </Link>
          )}
        </div>
      </div>

      {runError && (
        <div className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded px-2 py-1">
          {runError}
        </div>
      )}
      {runOk && (
        <div className="text-xs text-emerald-300 bg-emerald-900/20 border border-emerald-700/40 rounded px-2 py-1">
          {runOk}
        </div>
      )}

      {marketId && (
        <div className="border-t border-slate-700 pt-3 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Cached report</h3>
            {reportLoading && (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" /> loading…
              </span>
            )}
          </div>

          {reportError && (
            <div className="text-xs text-red-400">{reportError}</div>
          )}

          {!reportLoading && !reportError && !cached && (
            <div className="text-sm text-slate-500 italic">
              No hay reporte cacheado para este Pulse todavía. Corre el agente con «Run Now» para
              generarlo.
            </div>
          )}

          {cached && (
            <div className="space-y-3">
              <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
                <span>Generado: {formatDateTime(cached.generatedAt)}</span>
                {cached.model && <span>Modelo: {cached.model}</span>}
                <span>Tokens: {cached.tokensIn + cached.tokensOut}</span>
                <span>Costo: ${cached.cost.toFixed(6)}</span>
                {cached.pdfPath && <span>PDF: ✓</span>}
                {cached.emailSentAt && <span>Email: ✓ {formatDateTime(cached.emailSentAt)}</span>}
              </div>

              {cached.executiveSummary && (
                <div>
                  <div className="text-xs uppercase tracking-wider text-slate-400 mb-1">
                    Resumen ejecutivo
                  </div>
                  <div className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed bg-slate-900/40 border border-slate-700 rounded-lg p-3">
                    {cached.executiveSummary}
                  </div>
                </div>
              )}

              {cached.convictionAnalysis && (
                <div>
                  <div className="text-xs uppercase tracking-wider text-slate-400 mb-1">
                    Análisis de convicción
                  </div>
                  <div className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed bg-slate-900/40 border border-slate-700 rounded-lg p-3">
                    {cached.convictionAnalysis}
                  </div>
                </div>
              )}

              {nextStepsList.length > 0 && (
                <div>
                  <div className="text-xs uppercase tracking-wider text-slate-400 mb-1">
                    Próximos pasos
                  </div>
                  <ul className="list-disc list-inside text-sm text-slate-200 space-y-1 bg-slate-900/40 border border-slate-700 rounded-lg p-3">
                    {nextStepsList.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ul>
                </div>
              )}

              {cached.snapshot?.outcomes && cached.snapshot.outcomes.length > 0 && (
                <div>
                  <div className="text-xs uppercase tracking-wider text-slate-400 mb-1">
                    Snapshot de votos
                  </div>
                  <div className="text-xs text-slate-300 bg-slate-900/40 border border-slate-700 rounded-lg p-3 space-y-1">
                    <div>
                      Total: {cached.snapshot.totalVotes ?? 0} · Registrados:{' '}
                      {cached.snapshot.registeredVotes ?? 0} · Invitados:{' '}
                      {cached.snapshot.guestVotes ?? 0} · Confianza prom.:{' '}
                      {String(cached.snapshot.avgConfidence ?? '—')}
                    </div>
                    <ul className="space-y-0.5">
                      {cached.snapshot.outcomes.map((o, idx) => (
                        <li key={o.id ?? idx} className="flex justify-between gap-2">
                          <span className="truncate">{o.label ?? o.id ?? `Outcome ${idx + 1}`}</span>
                          <span className="text-slate-400 shrink-0">
                            {o.votes ?? 0} votos · {Math.round((o.pct ?? 0) * 100) / 100}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
