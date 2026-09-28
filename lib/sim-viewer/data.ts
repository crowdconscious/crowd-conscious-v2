/**
 * Single data entry for the simulation viewer (client-safe).
 * Fixture bytes are never imported here — server pages inject them, or
 * GET /api/sim-viewer/fixture serves them behind the feature flag.
 */

import type { SimulationReplayPayload } from '@/types/simulation-replay'

export type SimulationDataSource = 'fixture' | 'api'

export type SimulationDataResult =
  | { ok: true; source: SimulationDataSource; data: SimulationReplayPayload }
  | { ok: false; error: string; status?: number }

function isPayload(value: unknown): value is SimulationReplayPayload {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.isFixture === 'boolean' &&
    Array.isArray(v.votes) &&
    v.run !== undefined &&
    v.pulse !== undefined
  )
}

/**
 * Fetch a live replay from Task 2's endpoint.
 * Use initialData on fixture pages instead of fixtureFallback on real IDs.
 */
export async function fetchSimulationReplay(
  pulseId: string,
  options?: {
    runId?: string
    includeReal?: boolean
  }
): Promise<SimulationDataResult> {
  if (pulseId === 'fixture' || pulseId === 'sim-viewer-fixture') {
    return fetchSimulationFixture()
  }

  const params = new URLSearchParams()
  if (options?.runId) params.set('runId', options.runId)
  if (options?.includeReal) params.set('includeReal', '1')
  const qs = params.toString()
  const url = `/api/pulses/${encodeURIComponent(pulseId)}/simulation${qs ? `?${qs}` : ''}`

  try {
    const res = await fetch(url, { credentials: 'same-origin' })
    if (!res.ok) {
      return {
        ok: false,
        error: `Simulation API returned ${res.status}`,
        status: res.status,
      }
    }
    const json: unknown = await res.json()
    if (!isPayload(json)) {
      return { ok: false, error: 'Unexpected simulation payload shape' }
    }
    return { ok: true, source: 'api', data: json }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error'
    return { ok: false, error: message }
  }
}

export async function fetchSimulationFixture(): Promise<SimulationDataResult> {
  try {
    const res = await fetch('/api/sim-viewer/fixture', { credentials: 'same-origin' })
    if (!res.ok) {
      return {
        ok: false,
        error: `Fixture endpoint returned ${res.status}`,
        status: res.status,
      }
    }
    const json: unknown = await res.json()
    if (!isPayload(json)) {
      return { ok: false, error: 'Unexpected fixture payload shape' }
    }
    return { ok: true, source: 'fixture', data: json }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error'
    return { ok: false, error: message }
  }
}
