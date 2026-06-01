/**
 * Feature flags for Resend-backed product emails.
 * Auth / support / signal lifecycle emails use separate guards (RESEND_ENABLED, etc.).
 */

/** Market close / "you were right" voter emails. Off unless explicitly enabled. */
export function isPredictionResolutionEmailEnabled(): boolean {
  return process.env.PREDICTION_RESOLUTION_EMAIL_ENABLED === 'true'
}

/** "Te extrañamos / 7 días" weekly re-engagement cron. Disable with REENGAGEMENT_EMAIL_ENABLED=false. */
export function isReengagementEmailEnabled(): boolean {
  return process.env.REENGAGEMENT_EMAIL_ENABLED !== 'false'
}
