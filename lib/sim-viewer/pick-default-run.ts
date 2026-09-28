/**
 * Default simulation-run selection when `?runId=` is absent.
 *
 * Prefer the most recent complete, non-fixture, non-brand-pretest run that
 * already has a stored divergence score. Only if none are scored do we fall
 * back to the most recent complete non-fixture non-pretest run (endcard may
 * then show "—").
 *
 * Why: a newer complete re-run often lands before divergence is computed.
 * Picking strictly by `created_at DESC LIMIT 1` then hid the index on
 * anonymous / no-runId entry points (mobile in-app browser) while admin
 * deep-links with an explicit runId still showed it.
 */

import { parseDivergenceMeta } from './legacy.ts'

/** Minimal row shape for default-run selection (API + page + link builders). */
export type DefaultRunCandidate = {
  id: string
  created_at: string
  status: string
  divergence_index: number | null
  /** Viewer-shaped meta; optional for lean page selects. */
  divergence_meta?: unknown
  /** Legacy B-pipeline jsonb; optional. */
  divergence?: unknown
  is_fixture?: boolean | null
  is_brand_pretest?: boolean | null
}

/**
 * True when the run already stores a finite divergence index (column or
 * legacy jsonb). A genuine computed 0 counts; missing / partial does not.
 */
export function runHasStoredDivergenceScore(
  run: Pick<
    DefaultRunCandidate,
    'divergence_index' | 'divergence_meta' | 'divergence'
  >,
): boolean {
  if (
    typeof run.divergence_index === 'number' &&
    Number.isFinite(run.divergence_index)
  ) {
    return true
  }
  const meta =
    parseDivergenceMeta(run.divergence_meta) ??
    parseDivergenceMeta(run.divergence)
  return meta !== null && Number.isFinite(meta.index)
}

function isEligibleDefaultRun(run: DefaultRunCandidate): boolean {
  if (run.status !== 'complete') return false
  // Brand pretests and fixtures never surface on the public default path.
  if (run.is_brand_pretest === true) return false
  if (run.is_fixture === true) return false
  return true
}

function createdAtMs(run: DefaultRunCandidate): number {
  const ms = Date.parse(run.created_at)
  return Number.isFinite(ms) ? ms : 0
}

/**
 * Pick the default run from an already-fetched candidate list (newest-first
 * or unsorted). Returns null when nothing is eligible.
 */
export function pickDefaultSimulationRun<T extends DefaultRunCandidate>(
  runs: readonly T[],
): T | null {
  const eligible = runs.filter(isEligibleDefaultRun)
  if (eligible.length === 0) return null

  const scored = eligible.filter(runHasStoredDivergenceScore)
  const pool = scored.length > 0 ? scored : eligible

  let best: T | null = null
  let bestMs = -Infinity
  for (const run of pool) {
    const ms = createdAtMs(run)
    if (ms > bestMs) {
      best = run
      bestMs = ms
    }
  }
  return best
}

/** Public / closed-Pulse entry URL — always pin runId when known. */
export function buildSimulationViewerHref(
  pulseId: string,
  runId: string,
): string {
  return `/pulse/${pulseId}/simulacion?runId=${encodeURIComponent(runId)}`
}

/**
 * CDN Cache-Control for the simulation replay API.
 *
 * Long public TTL is only safe when the response is keyed by an explicit
 * `runId` AND already has a divergence score. Default (no runId) selection
 * and unscored runs must not stick for a day — otherwise a newly written
 * divergence_index stays hidden behind s-maxage.
 */
export function simulationReplayCacheControl(input: {
  cachePublic: boolean
  hasExplicitRunId: boolean
  divergenceIndex: number | null
}): string {
  if (!input.cachePublic) return 'private, no-store'

  const scored =
    typeof input.divergenceIndex === 'number' &&
    Number.isFinite(input.divergenceIndex)

  if (input.hasExplicitRunId && scored) {
    return 'public, s-maxage=86400, stale-while-revalidate=604800, max-age=0'
  }

  // Default pick or pre-score: short TTL so a later divergence write is visible.
  return 'public, s-maxage=60, stale-while-revalidate=300, max-age=0'
}
