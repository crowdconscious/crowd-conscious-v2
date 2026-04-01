import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { ApiResponse } from '@/lib/api-responses'
import { cronHealthCheck, cronHealthComplete } from '@/lib/cron-health'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

/**
 * Monthly “impact” email is disabled: the old template referenced communities / environmental units
 * that no longer exist. Rebuild as predictions + XP + Fund + blog highlights before re-enabling sends.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return ApiResponse.unauthorized('Invalid cron secret', 'INVALID_CRON_SECRET')
  }

  const admin = createAdminClient()
  const { runId } = await cronHealthCheck('monthly-impact', admin)

  await cronHealthComplete(runId, 'monthly-impact', admin, {
    success: true,
    summary: 'disabled: legacy_monthly_impact_template',
  })

  return ApiResponse.ok({
    skipped: true,
    reason: 'monthly_impact_disabled_pending_new_template',
  })
}
