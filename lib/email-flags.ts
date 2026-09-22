/**
 * Feature flags for Resend-backed product emails.
 * Auth / support / signal lifecycle emails use separate guards (RESEND_ENABLED, etc.).
 */

/** Market close / "you were right" voter emails. Off unless explicitly enabled. */
export function isPredictionResolutionEmailEnabled(): boolean {
  return process.env.PREDICTION_RESOLUTION_EMAIL_ENABLED === 'true'
}

/**
 * Inactivity re-engagement ("Te extrañamos / 7 días") — RETIRED in Phase 2.
 * Always false. Env var is ignored. See .deprecated/reengagement-inactive/.
 */
export function isReengagementEmailEnabled(): boolean {
  return false
}
