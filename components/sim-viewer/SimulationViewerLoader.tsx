'use client'

import { Suspense, useEffect, useState } from 'react'
import SimulationViewer from '@/components/sim-viewer/SimulationViewer'
import '@/components/sim-viewer/sim-viewer.css'
import {
  fetchSimulationReplay,
  type SimulationDataResult,
} from '@/lib/sim-viewer/data'
import type { SimulationReplayPayload } from '@/types/simulation-replay'

type Props = {
  pulseId: string
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
      const res = await fetchSimulationReplay(pulseId)
      if (!cancelled) setResult(res)
    })()
    return () => {
      cancelled = true
    }
  }, [pulseId, initialData])

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
            ? ' — el endpoint de replay (Task 2) aún no existe, o no hay corrida para este Pulse.'
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
    <SimulationViewer
      data={result.data}
      captureMode={captureMode}
    />
  )
}
