/**
 * Kill switch + cron auth for the serverless DOF classify/match backfill.
 * Independent of CICERON_INGESTION_ENABLED (daily DOF ingest stays untouched).
 */

import { timingSafeEqual } from 'crypto'

export function isBackfillEnabled(
  raw: string | undefined = process.env.CICERON_BACKFILL_ENABLED
): boolean {
  const v = raw?.trim().toLowerCase()
  return v === '1' || v === 'true' || v === 'yes'
}

/**
 * Compare Authorization Bearer token to CRON_SECRET with timingSafeEqual.
 * Length mismatch fails closed (same pattern as lib/email-unsubscribe.ts).
 */
export function authorizeCronBearer(
  authorizationHeader: string | null,
  secret: string | undefined = process.env.CRON_SECRET
): boolean {
  if (!secret || !authorizationHeader) return false
  const expected = `Bearer ${secret}`
  try {
    const a = Buffer.from(expected, 'utf8')
    const b = Buffer.from(authorizationHeader, 'utf8')
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}
