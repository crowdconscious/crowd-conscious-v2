/**
 * Viewer-facing re-exports + Task 3-only UI types.
 *
 * Wire/replay shapes live in `types/simulation.ts` (Task 1). This module
 * re-exports them so Tasks 3/4/5/6 can keep importing from
 * `@/types/simulation-replay` without duplicating the contract.
 */

export type {
  DivergenceMeta,
  DivergenceScores,
  OptionAgg,
  PersonaGrounding,
  SimulationPulseStatus,
  SimulationReplayMeta,
  SimulationReplayOption,
  SimulationReplayPayload,
  SimulationReplayPersona,
  SimulationReplayPulse,
  SimulationReplayRun,
  SimulationReplayVote,
  SimulationRunMode,
  SimulationRunStatus,
} from './simulation'

/** Alias used by the column canvas (same shape as OptionAgg). */
export type { OptionAgg as SimulationOptionAggregate } from './simulation'

/** Legacy alias; prefer SimulationPulseStatus. */
export type PulseLifecycleStatus =
  | import('./simulation').SimulationPulseStatus
  | 'draft'

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
