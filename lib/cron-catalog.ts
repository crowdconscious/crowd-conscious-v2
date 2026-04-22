/**
 * Single source of truth for cron jobs surfaced in the admin Cron Health
 * tile. Schedule strings mirror vercel.json so admins see the exact cron
 * expression that's running in production. `kind` decides which runner
 * the admin "Run now" button hits.
 *
 *   - 'agent'      → POST /api/predictions/admin/run-agent { agent: name }
 *   - 'operational'→ POST /api/admin/cron-run { job: name }
 *
 * Keep `name` aligned with the `job_name` written to `cron_job_runs` by
 * each route's `cronHealthCheck()` call. If those drift, the tile shows
 * stale data even though the cron ran successfully.
 */
export type CronJobKind = 'agent' | 'operational'

export interface CronJobMeta {
  name: string
  schedule: string
  kind: CronJobKind
  /**
   * Path to the cron route file (relative to repo root). Used by the
   * admin run-cron proxy to dynamically import the GET handler for
   * operational jobs.
   */
  routePath?: string
  description: string
}

export const CRON_CATALOG: readonly CronJobMeta[] = [
  // ── Operational (high-frequency, match-day critical) ──
  {
    name: 'live-auto-end',
    schedule: '*/5 * * * *',
    kind: 'operational',
    routePath: 'app/api/cron/live-auto-end/route',
    description: 'Closes live events whose ends_at is past.',
  },
  {
    name: 'live-reminders',
    schedule: '*/10 * * * *',
    kind: 'operational',
    routePath: 'app/api/cron/live-reminders/route',
    description: 'Sends pre-event reminder pushes.',
  },
  {
    name: 'pulse-auto-resolve',
    schedule: '5 * * * *',
    kind: 'operational',
    routePath: 'app/api/cron/pulse-auto-resolve/route',
    description: 'Resolves Pulse markets whose resolve_at has passed.',
  },
  // ── Agents (Anthropic-backed, cost-bearing) ──
  // Only agents with an active Vercel cron belong here; it powers the
  // Cron Health tile. Manual-only agents (content-creator, inbox-curator)
  // still have "Run Now" buttons on /predictions/admin/agents via the
  // AGENTS array in that page — that list is independent of this catalog.
  {
    name: 'news-monitor',
    schedule: '0 14 * * 1',
    kind: 'agent',
    description: 'Weekly news brief for Pulse/market ideation.',
  },
  {
    name: 'ceo-digest',
    schedule: '0 16 * * 1',
    kind: 'agent',
    description: 'Weekly CEO digest of platform activity.',
  },
  {
    name: 'sponsor-report',
    schedule: '0 9 1 * *',
    kind: 'agent',
    description: 'Monthly sponsor performance report.',
  },
  // ── Operational (daily/weekly/monthly cadence) ──
  {
    name: 'newsletter',
    schedule: '0 14 * * 1,3,5',
    kind: 'operational',
    routePath: 'app/api/cron/newsletter/route',
    description: 'Sends scheduled newsletter to subscribers.',
  },
  {
    name: 'reengagement-inactive',
    schedule: '0 16 * * 1',
    kind: 'operational',
    routePath: 'app/api/cron/reengagement-inactive/route',
    description: 'Re-engages dormant users with a digest email.',
  },
  {
    name: 'monthly-impact',
    schedule: '0 10 1 * *',
    kind: 'operational',
    routePath: 'app/api/cron/monthly-impact/route',
    description: 'Generates monthly impact reports.',
  },
  {
    name: 'archive',
    schedule: '0 6 * * *',
    kind: 'operational',
    routePath: 'app/api/cron/archive/route',
    description: 'Soft-archives stale rows across the platform.',
  },
] as const

export function findCronMeta(name: string): CronJobMeta | undefined {
  return CRON_CATALOG.find((j) => j.name === name)
}
