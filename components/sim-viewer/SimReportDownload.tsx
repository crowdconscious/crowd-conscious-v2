'use client'

/**
 * "Descargar reporte" controls for the closed-Pulse simulation page.
 * Summary is free when eligible; full shows a soft upsell when not entitled.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Meta = {
  enabled: boolean
  eligible: boolean
  canFull: boolean
  runId?: string
  upsellUrl?: string
}

type Props = {
  pulseId: string
  runId?: string | null
  /** Hide entirely in capture mode. */
  captureMode?: boolean
}

export function SimReportDownload({
  pulseId,
  runId = null,
  captureMode = false,
}: Props) {
  const [meta, setMeta] = useState<Meta | null>(null)
  const [busy, setBusy] = useState<'summary' | 'full' | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (captureMode) return
    let cancelled = false
    void (async () => {
      try {
        const qs = new URLSearchParams({ meta: '1' })
        if (runId) qs.set('runId', runId)
        const res = await fetch(
          `/api/pulses/${encodeURIComponent(pulseId)}/simulation/report?${qs}`,
          { credentials: 'same-origin' },
        )
        if (!res.ok) {
          if (!cancelled) setMeta({ enabled: false, eligible: false, canFull: false })
          return
        }
        const json = (await res.json()) as Meta
        if (!cancelled) setMeta(json)
      } catch {
        if (!cancelled) setMeta({ enabled: false, eligible: false, canFull: false })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [pulseId, runId, captureMode])

  if (captureMode) return null
  if (!meta?.enabled || !meta.eligible) return null

  const hrefFor = (tier: 'summary' | 'full') => {
    const qs = new URLSearchParams({ tier })
    if (runId) qs.set('runId', runId)
    return `/api/pulses/${encodeURIComponent(pulseId)}/simulation/report?${qs}`
  }

  async function download(tier: 'summary' | 'full') {
    setBusy(tier)
    setError(null)
    try {
      const res = await fetch(hrefFor(tier), { credentials: 'same-origin' })
      if (!res.ok) {
        if (res.status === 403) {
          setError('Reporte completo para clientes')
          return
        }
        setError('No se pudo descargar el reporte')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download =
        tier === 'full'
          ? `crowd-conscious-sim-completo.pdf`
          : `crowd-conscious-sim-resumen.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      setError('No se pudo descargar el reporte')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl shrink-0 px-3 pb-3 pt-2 sm:px-4">
      <div className="flex flex-col gap-2 rounded-lg border border-slate-700/80 bg-[#121820] px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-100">Descargar reporte</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Resumen gratuito · reporte completo con mapa y metodología
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy != null}
            onClick={() => void download('summary')}
            className="rounded-md border border-emerald-700/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200 hover:bg-emerald-900/40 disabled:opacity-50"
          >
            {busy === 'summary' ? 'Generando…' : 'Resumen (PDF)'}
          </button>
          {meta.canFull ? (
            <button
              type="button"
              disabled={busy != null}
              onClick={() => void download('full')}
              className="rounded-md border border-amber-700/50 bg-amber-950/30 px-3 py-2 text-sm text-amber-200 hover:bg-amber-900/30 disabled:opacity-50"
            >
              {busy === 'full' ? 'Generando…' : 'Reporte completo'}
            </button>
          ) : (
            <Link
              href={meta.upsellUrl ?? '/para-marcas'}
              className="rounded-md border border-slate-600 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
            >
              Reporte completo para clientes
            </Link>
          )}
        </div>
      </div>
      {error ? (
        <p className="mt-2 text-xs text-red-300">{error}</p>
      ) : null}
    </div>
  )
}
