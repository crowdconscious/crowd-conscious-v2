/**
 * Visor de simulación — Task 1 types.
 *
 * Table row shapes mirror the extended `simulation_*` schema (migrations
 * 252–254 + 266). The replay payload matches what Task 2 returns and what
 * Task 3 consumes (also mirrored in `fixtures/simulation-run.json`), so the
 * viewer can swap fixtures → live API with minimal glue.
 *
 * Naming note: the pack called the persona table `synthetic_personas`. In this
 * repo the table is `simulation_personas`. Types below use the repo names and
 * expose pack-shaped aliases where the viewer contract needs them (camelCase).
 *
 * No `any`. Real vote tables are never referenced for writes.
 */

import type { Database } from './database'

// Flag helper: lib/sim-viewer-flag.ts (NEXT_PUBLIC_SIM_VIEWER_ENABLED, default false).

// ---------------------------------------------------------------------------
// DB row aliases (post-migration 266 columns are optional on older rows)
// ---------------------------------------------------------------------------

export type SimulationPersonaRow =
  Database['public']['Tables']['simulation_personas']['Row']
export type SimulationRunRow =
  Database['public']['Tables']['simulation_runs']['Row']
export type SimulationVoteRow =
  Database['public']['Tables']['simulation_votes']['Row']

export type SimulationRunStatus = 'pending' | 'running' | 'complete' | 'failed'
export type SimulationRunMode = 'batch' | 'live'

/** Pack AMAI bands; `income_band` on older rows may also carry these. */
export type NseBand = 'A/B' | 'C+' | 'C' | 'C-' | 'D+' | 'D' | 'D/E'

/**
 * Per-persona source data for the viewer inspector (Task 5).
 * Stored on `simulation_personas.grounding` (migration 266).
 * Fixture rows MUST set `isExample: true` — values are illustrative, not
 * real census figures.
 */
export type PersonaGrounding = {
  sources: { name: string; year: number; url: string; table?: string }[]
  ageb: {
    code: string
    population?: number
    marginals: { label: string; value: string; share?: number }[]
  }
  method: string
  isExample?: boolean
}

// ---------------------------------------------------------------------------
// Divergence (viewer-facing OptionAgg API — see lib/divergence.ts)
// ---------------------------------------------------------------------------

/**
 * Per-option aggregate for Divergence Index + viewer reveal bars.
 * `share` is in 0–1. `meanConfidence` is 1–10.
 */
export interface OptionAgg {
  optionId: string
  share: number
  meanConfidence: number
  count: number
}

export interface DivergenceScores {
  /** 0–100. 0 = identical distributions. */
  index: number
  /** 0–100 share component (total variation distance × 100). */
  shareScore: number
  /** 0–100 confidence component (mean |Δconf| / 9 × 100). */
  confScore: number
}

export interface DivergenceMeta extends DivergenceScores {
  computedAt: string
}

// ---------------------------------------------------------------------------
// Task 2 / Task 3 replay contract (camelCase wire shape)
// ---------------------------------------------------------------------------

export interface SimulationReplayPersona {
  personaKey: string
  /**
   * Abstract label for the reasoning feed (Task 3). Not a real person's
   * name — typically the persona_key. Optional for older fixtures.
   */
  displayName?: string
  alcaldia: string
  colonia: string | null
  agebCode: string | null
  centroidLat: number | null
  centroidLng: number | null
  nseBand: string | null
  age: number
  sex: string
  education: string
  occupation: string
  householdSize: number | null
  personaSummary: string
  /** Optional inspector grounding; fixture sets isExample: true. */
  grounding?: PersonaGrounding
}

export interface SimulationReplayVote {
  sequenceIndex: number
  optionId: string
  confidence: number
  reasoning: string | null
  persona: SimulationReplayPersona
}

export interface SimulationReplayOption {
  id: string
  label: string
  order: number
}

/**
 * Pulse status as the viewer/API understands it.
 * Repo stores prediction_markets.status as active|resolved|… — Task 2 maps
 * resolved→closed; every other status→open (CTO: non-admin only on resolved).
 */
export type SimulationPulseStatus = 'open' | 'closed'

export interface SimulationReplayPulse {
  id: string
  question: string
  closesAt: string | null
  status: SimulationPulseStatus
  /** Display-only location line (e.g. alcaldías in the panel). Task 3. */
  locationLabel?: string | null
  options: SimulationReplayOption[]
}

export interface SimulationReplayRun {
  id: string
  pulseId: string
  status: SimulationRunStatus
  mode: SimulationRunMode
  model: string
  personaCount: number
  completedAt: string | null
  divergenceIndex: number | null
  divergenceMeta: DivergenceMeta | null
  isFixture: boolean
}

/**
 * Admin-facing counters for legacy vote resolution (pre-266 rows).
 * Present on every payload; zeros for fully-migrated / fixture runs.
 */
export interface SimulationReplayMeta {
  /** Votes that made it into the replay (option resolved + persona present). */
  votesResolved: number
  /** Rows read from simulation_votes for this run. */
  votesTotal: number
  /** Dropped: option_chosen did not match any market_outcomes.label. */
  votesUnmatched: number
  /** Dropped: persona join was null. */
  votesMissingPersona: number
}

/**
 * GET /api/pulses/[pulseId]/simulation response (Task 2).
 * `votes` MUST be ordered by sequenceIndex ascending.
 * `realAggregates` is null while the Pulse is open (unless admin ?includeReal=1).
 *
 * Top-level `isFixture` mirrors `run.isFixture` so Task 3's client
 * `isPayload()` accepts the live API without glue changes.
 */
export interface SimulationReplayPayload {
  /** True for seed/fixture runs — also mirrored on `run.isFixture`. */
  isFixture: boolean
  run: SimulationReplayRun
  pulse: SimulationReplayPulse
  votes: SimulationReplayVote[]
  simAggregates: OptionAgg[]
  realAggregates: OptionAgg[] | null
  /** Legacy resolution counters — useful on the admin run list. */
  meta?: SimulationReplayMeta
}
