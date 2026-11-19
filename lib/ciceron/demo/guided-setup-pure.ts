/**
 * 3-step firm setup wizard (despacho → clientes → estados).
 * Progress is local-only — no DB writes.
 */

export const GUIDED_SETUP_STEPS = ['despacho', 'clientes', 'estados'] as const
export type GuidedSetupStepId = (typeof GUIDED_SETUP_STEPS)[number]

export type GuidedSetupStorage = {
  skipped: boolean
  completed: boolean
  stepIndex: number
}

export const GUIDED_SETUP_STORAGE_KEY = 'ciceron-guided-setup-v1'

export function normalizeSetupStepIndex(index: number): number {
  if (!Number.isFinite(index) || index < 0) return 0
  if (index >= GUIDED_SETUP_STEPS.length) return GUIDED_SETUP_STEPS.length - 1
  return Math.floor(index)
}

export function nextSetupStep(index: number): number | 'done' {
  const n = normalizeSetupStepIndex(index) + 1
  return n >= GUIDED_SETUP_STEPS.length ? 'done' : n
}

export function prevSetupStep(index: number): number {
  return Math.max(0, normalizeSetupStepIndex(index) - 1)
}

export function parseGuidedSetupStorage(
  raw: string | null
): GuidedSetupStorage | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<GuidedSetupStorage>
    return {
      skipped: Boolean(parsed.skipped),
      completed: Boolean(parsed.completed),
      stepIndex: normalizeSetupStepIndex(Number(parsed.stepIndex) || 0),
    }
  } catch {
    return null
  }
}

export function shouldShowGuidedSetup(
  stored: GuidedSetupStorage | null
): boolean {
  if (!stored) return true
  if (stored.skipped || stored.completed) return false
  return true
}
