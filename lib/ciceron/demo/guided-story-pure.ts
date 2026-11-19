/** Pure guided-story helpers (safe for client + tests). */

/** Five-step client story + finale (step 6). */
export const GUIDED_STORY_STEPS = [1, 2, 3, 4, 5] as const
export type GuidedStoryStep = (typeof GUIDED_STORY_STEPS)[number] | 6

export type GuidedStoryState = {
  currentStep: GuidedStoryStep
  completedSteps: number[]
  dismissed: boolean
  completed: boolean
}

export const GUIDED_STORY_TOTAL = GUIDED_STORY_STEPS.length

/**
 * One fictional thread: Nexora Pagos — boletín → coincidencia → plazo →
 * aviso al cliente → resumen para socios.
 */
export function guidedStepHref(step: GuidedStoryStep): string {
  switch (step) {
    case 1:
      return '/ciceron/boletines'
    case 2:
      return '/ciceron/boletines'
    case 3:
      return '/ciceron/expedientes/case-1'
    case 4:
      return '/ciceron/revision'
    case 5:
      return '/ciceron/boletines/coordinador'
    case 6:
    default:
      return '/ciceron/hoy'
  }
}

/** Normalize persisted steps from older 6+finale tours into the 5-step story. */
export function normalizeGuidedStep(raw: number): GuidedStoryStep {
  if (!Number.isFinite(raw) || raw < 1) return 1
  if (raw >= 6) return 6
  return Math.min(Math.max(Math.floor(raw), 1), 5) as GuidedStoryStep
}
