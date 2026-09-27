/**
 * Shared simulation types adopted across Task 1 / 2 / 5 branches.
 *
 * `PersonaGrounding` below is copied verbatim from
 * `feat/sim-viewer-1-data-layer` (PR #17) so the stack merges without a
 * conflicting type. Do not drift this definition.
 */

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
