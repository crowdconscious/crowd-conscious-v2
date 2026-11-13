/** Pure guided-story helpers (safe for client + tests). */

export const GUIDED_STORY_STEPS = [1, 2, 3, 4, 5, 6] as const
export type GuidedStoryStep = (typeof GUIDED_STORY_STEPS)[number] | 7

export type GuidedStoryState = {
  currentStep: GuidedStoryStep
  completedSteps: number[]
  dismissed: boolean
  completed: boolean
}

export function guidedStepHref(step: GuidedStoryStep): string {
  switch (step) {
    case 1:
      return '/ciceron/hoy'
    case 2:
      return '/ciceron/boletines/coordinador'
    case 3:
      return '/ciceron/revision'
    case 4:
      return '/ciceron/expedientes'
    case 5:
      return '/ciceron/investigacion'
    case 6:
      return '/ciceron/fuentes-cobertura'
    case 7:
    default:
      return '/ciceron/hoy'
  }
}
