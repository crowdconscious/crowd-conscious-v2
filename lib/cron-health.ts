import type { SupabaseClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/resend'

/**
 * Call at the START of every cron route handler (after CRON_SECRET auth).
 * Inserts a `running` row in `cron_job_runs`.
 */
export async function cronHealthCheck(
  jobName: string,
  supabase: SupabaseClient
): Promise<{ runId: string }> {
  const { data, error } = await supabase
    .from('cron_job_runs')
    .insert({
      job_name: jobName,
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) {
    console.error('[cron-health] insert failed', jobName, error)
    return { runId: '' }
  }

  return { runId: data?.id ?? '' }
}

/**
 * Call at the END of every cron route handler (success or failure).
 * Updates the row; emails ADMIN_EMAIL on failure when Resend is configured.
 */
export async function cronHealthComplete(
  runId: string,
  jobName: string,
  supabase: SupabaseClient,
  result: { success: boolean; summary?: string; error?: string }
) {
  if (!runId) return

  const completedAt = new Date().toISOString()

  const { data: row } = await supabase
    .from('cron_job_runs')
    .select('started_at')
    .eq('id', runId)
    .maybeSingle()

  const started = row?.started_at ? new Date(row.started_at as string).getTime() : Date.now()
  const durationMs = Math.max(0, Date.now() - started)

  await supabase
    .from('cron_job_runs')
    .update({
      status: result.success ? 'success' : 'error',
      completed_at: completedAt,
      duration_ms: durationMs,
      summary: result.summary ?? null,
      error_message: result.error ?? null,
    })
    .eq('id', runId)

  if (!result.success && process.env.ADMIN_EMAIL && process.env.RESEND_API_KEY) {
    await sendEmail(process.env.ADMIN_EMAIL, {
      subject: `[CC Alert] Cron failed: ${jobName}`,
      html: `
        <p>The <strong>${jobName}</strong> cron job failed at ${completedAt}.</p>
        <p><strong>Error:</strong> ${result.error ?? 'Unknown error'}</p>
        <p>Check <code>cron_job_runs</code> in Supabase for details.</p>
      `,
    })
  }
}

/** Jobs that run monthly — "healthy" uses a longer window than daily crons. */
export const MONTHLY_CRON_JOBS = new Set(['monthly-impact', 'sponsor-report'])

export function cronJobIsHealthy(
  jobName: string,
  status: string | null | undefined,
  startedAt: string | null | undefined
): boolean {
  if (status !== 'success' || !startedAt) return false
  const t = new Date(startedAt).getTime()
  if (Number.isNaN(t)) return false
  const windowMs = MONTHLY_CRON_JOBS.has(jobName)
    ? 40 * 24 * 60 * 60 * 1000
    : 26 * 60 * 60 * 1000
  return t > Date.now() - windowMs
}
