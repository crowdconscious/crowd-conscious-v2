import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { cronJobIsHealthy } from '@/lib/cron-health'
import { CRON_CATALOG } from '@/lib/cron-catalog'

/**
 * GET /api/admin/cron-health
 * Last run per scheduled cron — Intelligence Hub System Health.
 *
 * Returns one row per entry in `lib/cron-catalog.ts`. Adding a new cron
 * job means: (1) add the route, (2) add a vercel.json schedule, (3) add
 * an entry to CRON_CATALOG. The tile picks it up automatically.
 */
export async function GET() {
  try {
    const profile = await getCurrentUser()
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()

    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim()
    const sessionEmail = profile.email?.toLowerCase().trim()
    const isAdmin =
      profile.user_type === 'admin' ||
      (!!adminEmail && !!sessionEmail && sessionEmail === adminEmail)

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const results = await Promise.all(
      CRON_CATALOG.map(async (job) => {
        const { data } = await supabase
          .from('cron_job_runs')
          .select('status, started_at, completed_at, error_message, summary')
          .eq('job_name', job.name)
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        const lastRun = (data?.started_at as string | undefined) ?? null
        const status = (data?.status as string | undefined) ?? 'never_run'

        return {
          agent: job.name,
          schedule: job.schedule,
          kind: job.kind,
          description: job.description,
          lastRun,
          status,
          error: (data?.error_message as string | null) ?? null,
          summary: (data?.summary as string | null) ?? null,
          isHealthy: cronJobIsHealthy(job.name, status, lastRun),
        }
      })
    )

    return NextResponse.json({ agents: results })
  } catch (e) {
    console.error('[cron-health]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
