import type { SupabaseClient } from '@supabase/supabase-js'
import * as Sentry from '@sentry/nextjs'
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

  if (!result.success) {
    // Always leave a greppable line in Vercel logs, even without Resend.
    console.error('[cron-alert] cron failed', jobName, runId, result.error ?? 'unknown error')
    Sentry.captureMessage(`Cron failed: ${jobName}`, { level: 'error', extra: { runId, error: result.error } })
    const to = cronAlertRecipient()
    if (process.env.RESEND_API_KEY) {
      try {
        await sendEmail(to, {
          subject: `[CC Alert] Cron failed: ${jobName}`,
          html: `
        <p>The <strong>${escapeHtml(jobName)}</strong> cron job failed at ${completedAt} (UTC).</p>
        <p><strong>Error:</strong> ${escapeHtml(result.error ?? 'Unknown error')}</p>
        <p>Check <code>cron_job_runs</code> (id ${escapeHtml(runId)}) in Supabase and the Vercel runtime logs for details.</p>
      `,
        })
      } catch (err) {
        console.error('[cron-alert] alert email failed', jobName, err)
      }
    }
  }
}

/** CRON_ALERT_EMAIL, else ADMIN_EMAIL, else Francisco's address. */
export function cronAlertRecipient(env: Record<string, string | undefined> = process.env): string {
  return env.CRON_ALERT_EMAIL?.trim() || env.ADMIN_EMAIL?.trim() || 'francisco@crowdconscious.app'
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)
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
