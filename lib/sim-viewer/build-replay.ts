/**
 * Pure builders for GET /api/pulses/[pulseId]/simulation.
 *
 * Takes already-fetched DB rows and returns the Task 2/3 wire payload.
 * No Supabase / Next imports — unit-testable, no `any`.
 *
 * Legacy (pre-migration-266) rows are supported at read time: option_id is
 * resolved from option_chosen→label, sequence_index via seeded shuffle, and
 * persona fields fall back to the cdmx-v1 columns. See lib/sim-viewer/legacy.ts.
 */

import { computeDivergence } from '../divergence.ts'
import type {
  DivergenceMeta,
  OptionAgg,
  PersonaGrounding,
  SimulationReplayMeta,
  SimulationReplayOption,
  SimulationReplayPayload,
  SimulationReplayPersona,
  SimulationReplayPulse,
  SimulationReplayRun,
  SimulationReplayVote,
  SimulationRunMode,
  SimulationRunStatus,
} from '../../types/simulation.ts'
import { toSimulationPulseStatus } from './access.ts'
import {
  assignLegacySequenceIndices,
  buildOptionLabelIndex,
  householdSizeFromText,
  latestVoteCreatedAt,
  normalizeNseBand,
  parseDivergenceMeta,
  resolveOptionId,
} from './legacy.ts'
import { personaDisplayLabel } from './persona-label.ts'

// ---------------------------------------------------------------------------
// Input row shapes (narrow projections the route selects)
// ---------------------------------------------------------------------------

export type ReplayPersonaRow = {
  /** UUID — used as personaKey fallback for pre-266 rows. */
  id?: string | null
  persona_key: string | null
  alcaldia: string
  colonia: string | null
  ageb_code: string | null
  centroid_lat: number | null
  centroid_lng: number | null
  nse_band: string | null
  income_band: string
  age: number
  gender: string
  education: string
  occupation: string
  household_size: number | null
  /** Free-text household (cdmx-v1); used only when household_size is null. */
  household?: string | null
  persona_narrative: string
  /**
   * Nullable jsonb from migration 266. Null/absent → omit on the wire.
   * Shape owned by Task 1 (`PersonaGrounding`); passed through unchanged.
   */
  grounding?: PersonaGrounding | null
}

export type ReplayVoteRow = {
  sequence_index: number | null
  option_id: string | null
  /** Pre-viewer pipeline stores the outcome LABEL here. */
  option_chosen?: string | null
  confidence: number
  reasoning: string | null
  reasoning_es: string | null
  created_at?: string | null
  persona: ReplayPersonaRow | null
}

export type ReplayRunRow = {
  id: string
  market_id: string | null
  status: string
  mode: string
  model: string
  n_agents: number
  completed_at: string | null
  divergence_index: number | null
  divergence_meta: unknown
  /**
   * Pre-266 B-pipeline column (`{ id, delta_shares, … }`).
   * Used when divergence_index / divergence_meta are null.
   */
  divergence?: unknown
  is_fixture: boolean
  revealed_at: string | null
}

export type ReplayPulseRow = {
  id: string
  title: string
  /** Mapped from prediction_markets.resolution_date. */
  resolution_date: string | null
  status: string
}

export type ReplayOutcomeRow = {
  id: string
  label: string
  sort_order: number | null
  vote_count: number
  total_confidence: number
  confident_pick_count: number | null
}

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

function asRunStatus(raw: string): SimulationRunStatus {
  if (
    raw === 'pending' ||
    raw === 'running' ||
    raw === 'complete' ||
    raw === 'failed'
  ) {
    return raw
  }
  // Unknown pipeline statuses — treat as failed so the viewer doesn't animate.
  return 'failed'
}

function asRunMode(raw: string): SimulationRunMode {
  return raw === 'live' ? 'live' : 'batch'
}

/**
 * Same formula as `outcomeAvgConfidenceFromTotals` in pulse-vote-aggregates:
 * total_confidence / confident_pick_count. Inlined so unit tests under
 * node --experimental-strip-types don't pull the ranking import graph.
 */
function meanConfidenceFromTotals(
  totalConfidence: number | null | undefined,
  confidentPickCount: number | null | undefined,
): number {
  const sum = typeof totalConfidence === 'number' ? totalConfidence : 0
  const n = typeof confidentPickCount === 'number' ? confidentPickCount : 0
  if (n <= 0) return 0
  return sum / n
}

/**
 * Abstract display label for the reasoning feed / inspector.
 * Never surfaces raw UUIDs — human persona_key, else "Persona N".
 */
export function abstractPersonaDisplayName(
  persona: ReplayPersonaRow,
  sequenceIndex: number,
): string {
  return personaDisplayLabel(persona.persona_key, sequenceIndex)
}

/**
 * Pass Task 1's grounding jsonb through unchanged.
 * Null / absent / non-object → omit (do not invent a conflicting shape).
 */
export function passThroughGrounding(
  raw: PersonaGrounding | null | undefined | unknown,
): PersonaGrounding | undefined {
  if (raw == null) return undefined
  if (typeof raw !== 'object' || Array.isArray(raw)) return undefined
  return raw as PersonaGrounding
}

export function mapPersona(
  persona: ReplayPersonaRow,
  sequenceIndex: number,
): SimulationReplayPersona {
  const personaKey =
    (persona.persona_key && persona.persona_key.trim().length > 0
      ? persona.persona_key
      : null) ??
    (persona.id && persona.id.trim().length > 0 ? persona.id : null) ??
    `persona-${sequenceIndex}`

  const householdSize =
    persona.household_size ??
    householdSizeFromText(persona.household ?? null)

  const mapped: SimulationReplayPersona = {
    personaKey,
    displayName: abstractPersonaDisplayName(persona, sequenceIndex),
    alcaldia: persona.alcaldia,
    colonia: persona.colonia,
    agebCode: persona.ageb_code,
    centroidLat: persona.centroid_lat,
    centroidLng: persona.centroid_lng,
    nseBand: normalizeNseBand(persona.nse_band ?? persona.income_band),
    age: persona.age,
    sex: persona.gender,
    education: persona.education,
    occupation: persona.occupation,
    householdSize,
    personaSummary: persona.persona_narrative,
  }
  const grounding = passThroughGrounding(persona.grounding)
  if (grounding !== undefined) {
    mapped.grounding = grounding
  }
  return mapped
}

export type MapVotesResult = {
  votes: SimulationReplayVote[]
  /** Votes dropped because option_chosen did not match any outcome label. */
  unmatchedCount: number
  /** Rows that had no persona join. */
  missingPersonaCount: number
  /** Total rows fed in (before filtering). */
  totalCount: number
}

/**
 * Sort + map votes for replay.
 *
 * Legacy support (no SQL required):
 *   - option_id null → resolve via option_chosen ↔ market_outcomes.label
 *   - sequence_index null → deterministic shuffle seeded by runId
 *   - unmatched labels are dropped, counted, and logged by the caller
 *
 * Output is strictly ascending by sequenceIndex.
 */
export function mapVotesOrdered(
  rows: ReplayVoteRow[],
  opts: {
    outcomes: readonly ReplayOutcomeRow[]
    runId: string
  },
): MapVotesResult {
  const labelIndex = buildOptionLabelIndex(opts.outcomes)
  const resolvable: {
    row: ReplayVoteRow
    optionId: string
  }[] = []
  let unmatchedCount = 0
  let missingPersonaCount = 0

  for (const row of rows) {
    if (!row.persona) {
      missingPersonaCount += 1
      continue
    }
    const optionId = resolveOptionId(row, labelIndex)
    if (!optionId) {
      unmatchedCount += 1
      const label = row.option_chosen ?? '(null)'
      console.warn(
        `[sim-viewer] unmatched vote option_chosen=${JSON.stringify(label)} run=${opts.runId}`,
      )
      continue
    }
    resolvable.push({ row, optionId })
  }

  const sequences = resolvable.map((r) => r.row.sequence_index)
  const assigned = assignLegacySequenceIndices(sequences, opts.runId)

  const mapped: SimulationReplayVote[] = resolvable.map((r, i) => {
    const sequenceIndex = assigned[i]!
    return {
      sequenceIndex,
      optionId: r.optionId,
      confidence: r.row.confidence,
      reasoning: r.row.reasoning ?? r.row.reasoning_es,
      persona: mapPersona(r.row.persona!, sequenceIndex),
    }
  })

  mapped.sort((a, b) => a.sequenceIndex - b.sequenceIndex)
  return {
    votes: mapped,
    unmatchedCount,
    missingPersonaCount,
    totalCount: rows.length,
  }
}

export function computeSimAggregates(
  votes: SimulationReplayVote[],
  options: SimulationReplayOption[],
): OptionAgg[] {
  const byId = new Map<string, { count: number; confSum: number }>()
  for (const o of options) byId.set(o.id, { count: 0, confSum: 0 })
  for (const v of votes) {
    const bucket = byId.get(v.optionId)
    if (!bucket) continue
    bucket.count += 1
    bucket.confSum += v.confidence
  }
  const total = votes.length || 1
  return options.map((o) => {
    const b = byId.get(o.id)!
    return {
      optionId: o.id,
      share: b.count / total,
      meanConfidence: b.count === 0 ? 0 : b.confSum / b.count,
      count: b.count,
    }
  })
}

/**
 * Real aggregates from maintained `market_outcomes` columns (read-only).
 * Does NOT touch market_votes rows.
 */
export function realAggregatesFromOutcomes(
  outcomes: ReplayOutcomeRow[],
  totalVotes: number,
): OptionAgg[] {
  const denom = totalVotes > 0 ? totalVotes : 0
  return outcomes.map((o) => {
    return {
      optionId: o.id,
      share: denom > 0 ? o.vote_count / denom : 0,
      meanConfidence: meanConfidenceFromTotals(
        o.total_confidence,
        o.confident_pick_count,
      ),
      count: o.vote_count,
    }
  })
}

export function mapOptions(
  outcomes: ReplayOutcomeRow[],
): SimulationReplayOption[] {
  return [...outcomes]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((o, i) => ({
      id: o.id,
      label: o.label,
      order: o.sort_order ?? i,
    }))
}

function locationLabelFromVotes(votes: SimulationReplayVote[]): string | null {
  const seen = new Set<string>()
  for (const v of votes) {
    if (v.persona.alcaldia) seen.add(v.persona.alcaldia)
  }
  if (seen.size === 0) return null
  return [...seen].join(' · ')
}

/**
 * Resolve viewer divergence from new columns, then legacy jsonb.
 *
 * Returns null index when nothing was stored (pipeline skips write when the
 * Pulse has no real votes — a synthetic 0 would read as "perfect match").
 * A genuine computed 0 (identical real vs sim) still comes through as 0.
 */
export function resolveDivergence(
  run: ReplayRunRow,
): { index: number | null; meta: DivergenceMeta | null } {
  const meta =
    parseDivergenceMeta(run.divergence_meta) ??
    parseDivergenceMeta(run.divergence)

  // Prefer denormalized column only when it is a finite number. Do not treat
  // absent/NaN as 0 — missing divergence must stay null for the UI "—".
  const fromColumn =
    typeof run.divergence_index === 'number' &&
    Number.isFinite(run.divergence_index)
      ? run.divergence_index
      : null

  const index = fromColumn ?? meta?.index ?? null

  return { index, meta }
}

export type BuildReplayArgs = {
  run: ReplayRunRow
  pulse: ReplayPulseRow
  voteRows: ReplayVoteRow[]
  outcomes: ReplayOutcomeRow[]
  /** prediction_markets.total_votes (people count). */
  totalVotes: number
  includeRealAggregates: boolean
}

/**
 * Build the Task 2 response payload. `votes` are sorted by sequenceIndex.
 */
export function buildReplayPayload(args: BuildReplayArgs): SimulationReplayPayload {
  const options = mapOptions(args.outcomes)
  const mapped = mapVotesOrdered(args.voteRows, {
    outcomes: args.outcomes,
    runId: args.run.id,
  })
  const votes = mapped.votes
  const simAggregates = computeSimAggregates(votes, options)
  const realAggregates = args.includeRealAggregates
    ? realAggregatesFromOutcomes(args.outcomes, args.totalVotes)
    : null

  const resolved = resolveDivergence(args.run)
  let divergenceIndex = resolved.index
  let divergenceMeta = resolved.meta

  // Older/manual runs may never have persisted divergence_index. When real
  // votes exist, compute on the fly so the viewer matches the PDF report.
  if (
    divergenceIndex == null &&
    args.totalVotes > 0 &&
    realAggregates != null &&
    realAggregates.some((a) => (a.count || 0) > 0) &&
    simAggregates.length > 0
  ) {
    const scores = computeDivergence(simAggregates, realAggregates)
    divergenceIndex = scores.index
    divergenceMeta = {
      index: scores.index,
      shareScore: scores.shareScore,
      confScore: scores.confScore,
      computedAt: new Date().toISOString(),
    }
  }

  const completedAt =
    args.run.completed_at ??
    latestVoteCreatedAt(args.voteRows.map((v) => v.created_at))

  const run: SimulationReplayRun = {
    id: args.run.id,
    pulseId: args.run.market_id ?? args.pulse.id,
    status: asRunStatus(args.run.status),
    mode: asRunMode(args.run.mode),
    model: args.run.model,
    personaCount: args.run.n_agents,
    completedAt,
    divergenceIndex,
    divergenceMeta,
    isFixture: args.run.is_fixture,
  }

  const pulse: SimulationReplayPulse = {
    id: args.pulse.id,
    question: args.pulse.title,
    closesAt: args.pulse.resolution_date,
    status: toSimulationPulseStatus(args.pulse.status),
    locationLabel: locationLabelFromVotes(votes),
    options,
  }

  const meta: SimulationReplayMeta = {
    votesResolved: votes.length,
    votesTotal: mapped.totalCount,
    votesUnmatched: mapped.unmatchedCount,
    votesMissingPersona: mapped.missingPersonaCount,
  }

  return {
    // Top-level flag so Task 3's isPayload() accepts the live API response.
    isFixture: args.run.is_fixture,
    run,
    pulse,
    votes,
    simAggregates,
    realAggregates,
    meta,
  }
}

// Re-export legacy helpers tests may want through this module.
export {
  normalizeLabelKey,
  normalizeNseBand,
  householdSizeFromText,
  assignLegacySequenceIndices,
  parseDivergenceMeta,
  resolveOptionId,
  buildOptionLabelIndex,
  DIVERGENCE_UNAVAILABLE_HINT,
} from './legacy.ts'
