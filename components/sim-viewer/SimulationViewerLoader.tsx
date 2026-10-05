'use client'

import { Suspense, useEffect, useState } from 'react'
import SimulationViewer from '@/components/sim-viewer/SimulationViewer'
import { SimReportDownload } from '@/components/sim-viewer/SimReportDownload'
import '@/components/sim-viewer/sim-viewer.css'
import {
  fetchSimulationReplay,
  type SimulationDataResult,
} from '@/lib/sim-viewer/data'
import type { SimulationReplayPayload } from '@/types/simulation-replay'

type Props = {
  pulseId: string
  /** Optional explicit run (admin list deep-link). */
  runId?: string | null
  /** When set, skip the fetch and render this payload (fixture routes). */
  initialData?: SimulationReplayPayload
  captureMode?: boolean
  /**
   * Seeds the Task 5 inspector via ?persona= (also read from the URL inside
   * the viewer). Kept as a prop so server pages can forward searchParams.
   */
  initialPersonaKey?: string | null
}

/**
 * Client loader: one data hook so swapping fixture → Task 2 API is local.
 * Suspense wraps the viewer because it reads useSearchParams for ?captura=
 * and ?persona=.
 */
export default function SimulationViewerLoader(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl py-20 text-center text-sm text-slate-400">
          Cargando simulación…
        </div>
      }
    >
      <SimulationViewerLoaderInner {...props} />
    </Suspense>
  )
}

function SimulationViewerLoaderInner({
  pulseId,
  runId = null,
  initialData,
  captureMode = false,
  initialPersonaKey: _initialPersonaKey = null,
}: Props) {
  // Deep link: pages forward ?persona=; the viewer reads it from the URL
  // via useSearchParams (Task 5). Prop kept so call sites stay typed.
  void _initialPersonaKey

  const [result, setResult] = useState<SimulationDataResult | null>(
    initialData
      ? { ok: true, source: initialData.isFixture ? 'fixture' : 'api', data: initialData }
      : null
  )

  useEffect(() => {
    if (initialData) return
    let cancelled = false
    void (async () => {
      const res = await fetchSimulationReplay(pulseId, {
        runId: runId ?? undefined,
      })
      if (!cancelled) setResult(res)
    })()
    return () => {
      cancelled = true
    }
  }, [pulseId, runId, initialData])

  if (!result) {
    return (
      <div className="mx-auto max-w-6xl py-20 text-center text-sm text-slate-400">
        Cargando simulación…
      </div>
    )
  }

  if (!result.ok) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-slate-700 bg-[#1a2029] p-6 text-center">
        <p className="text-sm font-medium text-slate-200">
          No hay simulación disponible
        </p>
        <p className="mt-2 text-xs text-slate-500">
          {result.error}
          {result.status === 404
            ? ' — no hay corrida disponible para este Pulse, o no tienes acceso.'
            : ''}
        </p>
        <p className="mt-4 text-xs text-amber-200/80">
          Vista previa con fixture:{' '}
          <a
            className="underline hover:text-amber-100"
            href="/admin/sim-viewer/fixture"
          >
            /admin/sim-viewer/fixture
          </a>
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <SimReportDownload
        pulseId={pulseId}
        runId={runId ?? result.data.run.id}
        captureMode={captureMode}
      />
      {/* flex-1 + min-h-0: desktop shell must fill leftover height under the
          report chrome — a nested h-dvh was taller than the page and got
          clipped by the page's overflow-hidden (endcard actions unreachable). */}
      <div className="flex min-h-0 flex-1 flex-col">
        <SimulationViewer
          data={result.data}
          captureMode={captureMode}
        />
      </div>
    </div>
  )
}
