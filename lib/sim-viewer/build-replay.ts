/**
 * Pure builders for GET /api/pulses/[pulseId]/simulation.
 *
 * Takes already-fetched DB rows and returns the Task 2/3 wire payload.
 * No Supabase / Next imports — unit-testable, no `any`.
 */

import type {
  DivergenceMeta,
  OptionAgg,
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

// ---------------------------------------------------------------------------
// Input row shapes (narrow projections the route selects)
// ---------------------------------------------------------------------------

export type ReplayPersonaRow = {
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
  persona_narrative: string
}

export type ReplayVoteRow = {
  sequence_index: number | null
  option_id: string | null
  confidence: number
  reasoning: string | null
  reasoning_es: string | null
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

function parseDivergenceMeta(raw: unknown): DivergenceMeta | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const index = typeof o.index === 'number' ? o.index : null
  const shareScore = typeof o.shareScore === 'number' ? o.shareScore : null
  const confScore = typeof o.confScore === 'number' ? o.confScore : null
  const computedAt =
    typeof o.computedAt === 'string'
      ? o.computedAt
      : typeof o.computed_at === 'string'
        ? o.computed_at
        : null
  if (
    index === null ||
    shareScore === null ||
    confScore === null ||
    computedAt === null
  ) {
    return null
  }
  return { index, shareScore, confScore, computedAt }
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
 * Abstract display label for the reasoning feed (Task 3).
 * Not a real person name — keyed off persona_key / alcaldia.
 */
export function abstractPersonaDisplayName(
  persona: ReplayPersonaRow,
  sequenceIndex: number,
): string {
  if (persona.persona_key && persona.persona_key.trim().length > 0) {
    return persona.persona_key
  }
  return `agente-${sequenceIndex}`
}

export function mapPersona(
  persona: ReplayPersonaRow,
  sequenceIndex: number,
): SimulationReplayPersona {
  return {
    personaKey: persona.persona_key ?? `persona-${sequenceIndex}`,
    displayName: abstractPersonaDisplayName(persona, sequenceIndex),
    alcaldia: persona.alcaldia,
    colonia: persona.colonia,
    agebCode: persona.ageb_code,
    centroidLat: persona.centroid_lat,
    centroidLng: persona.centroid_lng,
    nseBand: persona.nse_band ?? persona.income_band,
    age: persona.age,
    sex: persona.gender,
    education: persona.education,
    occupation: persona.occupation,
    householdSize: persona.household_size,
    personaSummary: persona.persona_narrative,
  }
}

/**
 * Sort + map votes. Votes without sequence_index or option_id are dropped
 * (pre-viewer pipeline rows cannot be replayed). Output is strictly
 * ascending by sequenceIndex.
 */
export function mapVotesOrdered(rows: ReplayVoteRow[]): SimulationReplayVote[] {
  const mapped: SimulationReplayVote[] = []
  for (const row of rows) {
    if (row.sequence_index === null || row.option_id === null) continue
    if (!row.persona) continue
    mapped.push({
      sequenceIndex: row.sequence_index,
      optionId: row.option_id,
      confidence: row.confidence,
      reasoning: row.reasoning ?? row.reasoning_es,
      persona: mapPersona(row.persona, row.sequence_index),
    })
  }
  mapped.sort((a, b) => a.sequenceIndex - b.sequenceIndex)
  return mapped
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
  const votes = mapVotesOrdered(args.voteRows)
  const simAggregates = computeSimAggregates(votes, options)
  const realAggregates = args.includeRealAggregates
    ? realAggregatesFromOutcomes(args.outcomes, args.totalVotes)
    : null

  const run: SimulationReplayRun = {
    id: args.run.id,
    pulseId: args.run.market_id ?? args.pulse.id,
    status: asRunStatus(args.run.status),
    mode: asRunMode(args.run.mode),
    model: args.run.model,
    personaCount: args.run.n_agents,
    completedAt: args.run.completed_at,
    divergenceIndex: args.run.divergence_index,
    divergenceMeta: parseDivergenceMeta(args.run.divergence_meta),
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

  return {
    // Top-level flag so Task 3's isPayload() accepts the live API response.
    isFixture: args.run.is_fixture,
    run,
    pulse,
    votes,
    simAggregates,
    realAggregates,
  }
}
