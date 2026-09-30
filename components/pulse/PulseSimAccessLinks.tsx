'use client'

/**
 * Closed-Pulse entry points for simulation replay + report download.
 * Used on /pulse/results cards and /pulse/[id] once a run is viewable.
 * Does not alter the simulation viewer itself.
 */

import { useState } from 'react'
import Link from 'next/link'

type Props = {
  locale: 'es' | 'en'
  pulseId: string
  /** When set, show "Ver la simulación". */
  simulationViewerHref?: string | null
  simulationRunId?: string | null
  /** Server already checked SIM_REPORT_ENABLED + isReportEligible. */
  reportEligible?: boolean
  /** Who may pull the full PDF; summary remains free when eligible. */
  reportCanFull?: boolean
  /** Compact row for listing cards; default is stacked detail-page CTAs. */
  compact?: boolean
  className?: string
}

export default function PulseSimAccessLinks({
  locale,
  pulseId,
  simulationViewerHref = null,
  simulationRunId = null,
  reportEligible = false,
  reportCanFull = false,
  compact = false,
  className = '',
}: Props) {
  const [busy, setBusy] = useState<'summary' | 'full' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const showSim = typeof simulationViewerHref === 'string' && simulationViewerHref.length > 0
  const showReport = reportEligible === true
  if (!showSim && !showReport) return null

  const es = locale === 'es'
  const hrefFor = (tier: 'summary' | 'full') => {
    const qs = new URLSearchParams({ tier })
    if (simulationRunId) qs.set('runId', simulationRunId)
    return `/api/pulses/${encodeURIComponent(pulseId)}/simulation/report?${qs}`
  }

  async function download(tier: 'summary' | 'full') {
    setBusy(tier)
    setError(null)
    try {
      const res = await fetch(hrefFor(tier), { credentials: 'same-origin' })
      if (!res.ok) {
        if (res.status === 403) {
          setError(es ? 'Reporte completo para clientes' : 'Full report for clients')
          return
        }
        setError(es ? 'No se pudo descargar el reporte' : 'Could not download the report')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download =
        tier === 'full'
          ? 'crowd-conscious-sim-completo.pdf'
          : 'crowd-conscious-sim-resumen.pdf'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      setError(es ? 'No se pudo descargar el reporte' : 'Could not download the report')
    } finally {
      setBusy(null)
    }
  }

  const linkClass = compact
    ? 'inline-flex min-h-[44px] items-center text-xs font-medium text-amber-300 hover:text-amber-200'
    : 'inline-flex min-h-[44px] items-center justify-center rounded-xl border border-amber-400/40 bg-amber-500/15 px-5 py-2.5 text-sm font-semibold text-amber-100 transition hover:border-amber-300/70 hover:bg-amber-500/25'

  const btnClass = compact
    ? 'inline-flex min-h-[44px] items-center text-xs font-medium text-emerald-400 hover:text-emerald-300 disabled:opacity-50'
    : 'inline-flex min-h-[44px] items-center justify-center rounded-xl border border-emerald-700/60 bg-emerald-950/40 px-5 py-2.5 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-900/40 disabled:opacity-50'

  const upsellClass = compact
    ? 'inline-flex min-h-[44px] items-center text-xs font-medium text-slate-400 hover:text-slate-300'
    : 'inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-600 px-5 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-800'

  return (
    <div
      className={`flex flex-col gap-2 ${compact ? 'sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1' : 'sm:flex-row sm:flex-wrap'} ${className}`.trim()}
      data-pulse-sim-access="1"
    >
      {showSim ? (
        <Link
          href={simulationViewerHref}
          className={linkClass}
          data-sim-viewer-entry="1"
        >
          {es ? 'Ver la simulación' : 'Watch the simulation'}
          {compact ? ' →' : ''}
        </Link>
      ) : null}
      {showReport ? (
        <>
          <button
            type="button"
            disabled={busy != null}
            onClick={() => void download('summary')}
            className={btnClass}
            data-sim-report-entry="summary"
          >
            {busy === 'summary'
              ? es
                ? 'Generando…'
                : 'Generating…'
              : es
                ? 'Descargar reporte'
                : 'Download report'}
          </button>
          {reportCanFull ? (
            <button
              type="button"
              disabled={busy != null}
              onClick={() => void download('full')}
              className={btnClass}
              data-sim-report-entry="full"
            >
              {busy === 'full'
                ? es
                  ? 'Generando…'
                  : 'Generating…'
                : es
                  ? 'Reporte completo'
                  : 'Full report'}
            </button>
          ) : (
            <Link href="/para-marcas" className={upsellClass} data-sim-report-upsell="1">
              {es ? 'Reporte completo para clientes' : 'Full report for clients'}
            </Link>
          )}
        </>
      ) : null}
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  )
}
