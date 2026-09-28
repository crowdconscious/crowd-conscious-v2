'use client'

import { useEffect, useState } from 'react'
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
  initialPersonaKey?: string | null
}

/**
 * Client loader: one data hook so swapping fixture → Task 2 API is local.
 */
export default function SimulationViewerLoader({
  pulseId,
  initialData,
  captureMode = false,
  initialPersonaKey = null,
}: Props) {
  const [result, setResult] = useState<SimulationDataResult | null>(
    initialData
      ? { ok: true, source: initialData.isFixture ? 'fixture' : 'api', data: initialData }
      : null
  )
  const [personaKey, setPersonaKey] = useState<string | null>(initialPersonaKey)

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
    <SimulationViewer
      data={result.data}
      captureMode={captureMode}
      selectedPersonaKey={personaKey}
      onPersonaSelect={setPersonaKey}
    />
  )
}
