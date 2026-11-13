/**
 * Kill switch + cron auth for the serverless DOF classify/match backfill.
 * Independent of CICERON_INGESTION_ENABLED (daily DOF ingest stays untouched).
 */

export function isBackfillEnabled(
  raw: string | undefined = process.env.CICERON_BACKFILL_ENABLED
): boolean {
  const v = raw?.trim().toLowerCase()
  return v === '1' || v === 'true' || v === 'yes'
}

export function authorizeCronBearer(
  authorizationHeader: string | null,
  secret: string | undefined = process.env.CRON_SECRET
): boolean {
  if (!secret) return false
  return authorizationHeader === `Bearer ${secret}`
}
