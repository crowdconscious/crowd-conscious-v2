/**
 * Kill switch for the 09:00 America/Mexico_City morning email cron.
 * Default off. Do not set Vercel env from this PR.
 */

import { authorizeCronBearer } from '@/lib/ciceron/dof/backfill-gate'

export function isMorningEmailEnabled(
  raw: string | undefined = process.env.CICERON_MORNING_EMAIL_ENABLED
): boolean {
  const v = raw?.trim().toLowerCase()
  return v === '1' || v === 'true' || v === 'yes'
}

export { authorizeCronBearer as authorizeMorningEmailCron }
