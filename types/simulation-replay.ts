/**
 * Simulation replay payload — shared shape for Task 2's
 * GET /api/pulses/[pulseId]/simulation and Task 3's fixture.
 *
 * Field names follow the Prompt Pack (Task 2 response). When Task 1's
 * data layer lands with slightly different column names, adapt at the
 * API boundary — do not change this viewer contract lightly.
 */

export type SimulationRunStatus =
  | 'pending'
  | 'running'
  | 'complete'
  | 'failed'

export type SimulationRunMode = 'batch' | 'live'

export type PulseLifecycleStatus = 'open' | 'closed' | 'draft'

export type SimulationReplayRun = {
  id: string
  pulseId: string
  status: SimulationRunStatus
  mode: SimulationRunMode
  model: string
  personaCount: number
  completedAt: string | null
  divergenceIndex: number | null
  divergenceMeta: {
    shareScore: number
    confScore: number
    computedAt: string
  } | null
}

export type SimulationReplayOption = {
  id: string
  label: string
  order: number
}

export type SimulationReplayPulse = {
  id: string
  question: string
  closesAt: string | null
  status: PulseLifecycleStatus
  /** Display-only context (alcaldía / location line). */
  locationLabel: string | null
  options: SimulationReplayOption[]
}

export type SimulationReplayPersona = {
  personaKey: string
  /** Display first name for the reasoning feed (synthetic, not a real person). */
  displayName: string
  alcaldia: string
  colonia: string | null
  agebCode: string | null
  centroidLat: number | null
  centroidLng: number | null
  nseBand: string
  age: number
  sex: string
  education: string
  occupation: string
  personaSummary: string
}

export type SimulationReplayVote = {
  sequenceIndex: number
  optionId: string
  confidence: number
  reasoning: string
  persona: SimulationReplayPersona
}

export type SimulationOptionAggregate = {
  optionId: string
  /** Share in 0–1. */
  share: number
  meanConfidence: number
  count: number
}

/**
 * Full payload the viewer consumes. Identical for the live API and the
 * marked fixture file.
 */
export type SimulationReplayPayload = {
  /** True when this payload came from fixtures/ — never present real results as fact. */
  isFixture: boolean
  run: SimulationReplayRun
  pulse: SimulationReplayPulse
  /** Ordered by sequenceIndex ascending (replay order). */
  votes: SimulationReplayVote[]
  simAggregates: SimulationOptionAggregate[]
  /**
   * Null while the pulse is open (even for admins), unless Task 2's
   * ?includeReal=1 admin param is used. Fixture includes sample reals
   * so Beat 4 (REVEAL) can be demonstrated.
   */
  realAggregates: SimulationOptionAggregate[] | null
}

export type SimulationAspectRatio = '16:9' | '9:16' | '1:1'

/** Numeric multipliers, or the capture-mode "cinemático" paced preset. */
export type SimulationPlaybackSpeed = 1 | 2 | 4 | 'cinematic'

export type SimulationViewerBeat =
  | 'populate'
  | 'vote'
  | 'settle'
  | 'reveal'
  | 'endcard'
  | 'done'

/**
 * Extension slots so Tasks 4/5/6 can plug in without rewriting the core.
 * The viewer accepts these as optional props / URL params later.
 */
export type SimulationViewerExtensionSlots = {
  /** Task 4 — Columnas | Mapa toggle. Shared playback clock. */
  viewMode?: 'columns' | 'map'
  onViewModeChange?: (mode: 'columns' | 'map') => void
  /** Task 5 — persona inspector. */
  selectedPersonaKey?: string | null
  onPersonaSelect?: (personaKey: string | null) => void
  /** Task 6 — capture mode. */
  captureMode?: boolean
  aspectRatio?: SimulationAspectRatio
  onAspectRatioChange?: (ratio: SimulationAspectRatio) => void
}
