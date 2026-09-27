/**
 * Shared simulation types adopted across Task 1 / 2 / 5 branches.
 *
 * `PersonaGrounding` is the inspector contract: stored as
 * `simulation_personas.grounding` (jsonb, migration 266 on PR #17) and
 * passed through by the Task 2 replay API. Keep this shape stable —
 * other branches import it verbatim.
 *
 * Fixture rows MUST set `isExample: true`. Never present fixture numbers
 * as real INEGI / AMAI figures.
 */

/**
 * Per-persona census / NSE source data for the viewer inspector.
 */
export type PersonaGrounding = {
  sources: { name: string; year: number; url: string; table?: string }[]
  ageb: {
    code: string
    population?: number
    marginals: { label: string; value: string; share?: number }[]
  }
  method: string
  /** True for fixture / demo rows — UI must label values as examples. */
  isExample?: boolean
}
