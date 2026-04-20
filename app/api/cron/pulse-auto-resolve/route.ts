import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { notifyMarketResolutionVoters } from '@/lib/market-resolution-notifications'
import { runCaseStudyDraft } from '@/lib/agents/content-creator'
import { cronHealthCheck, cronHealthComplete } from '@/lib/cron-health'

export const runtime = 'nodejs'
export const maxDuration = 120
export const dynamic = 'force-dynamic'

const JOB_NAME = 'pulse-auto-resolve'

type PluralityResult = {
  success?: boolean
  error?: string
  total_voters?: number
  correct_voters?: number
  winning_outcome?: string
  winning_outcome_id?: string
}

/**
 * Resolves Pulse markets whose resolution_date has passed: plurality winner from market_votes.
 * Vercel cron — Authorization: Bearer CRON_SECRET
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { runId } = await cronHealthCheck(JOB_NAME, admin)
  const now = new Date().toISOString()

  const { data: rows, error: qErr } = await admin
    .from('prediction_markets')
    .select('id, title')
    .eq('is_pulse', true)
    .in('status', ['active', 'trading'])
    .is('archived_at', null)
    .lt('resolution_date', now)

  if (qErr) {
    console.error('[cron/pulse-auto-resolve]', qErr)
    await cronHealthComplete(runId, JOB_NAME, admin, {
      success: false,
      error: qErr.message,
    })
    return NextResponse.json({ error: qErr.message }, { status: 500 })
  }

  const list = rows ?? []
  let resolved = 0
  const errors: { marketId: string; message: string }[] = []

  for (const row of list) {
    const { data: raw, error: rpcErr } = await admin.rpc('resolve_pulse_market_by_plurality', {
      p_market_id: row.id,
    })

    if (rpcErr) {
      errors.push({ marketId: row.id, message: rpcErr.message })
      continue
    }

    const data = raw as PluralityResult
    if (data?.success === false) {
      errors.push({ marketId: row.id, message: data.error || 'unknown' })
      continue
    }

    const winningOutcomeId = data?.winning_outcome_id
    const winningLabel = data?.winning_outcome || 'Unknown'
    if (winningOutcomeId) {
      void notifyMarketResolutionVoters(admin, {
        marketId: row.id,
        winningOutcomeId,
        winningLabel,
      }).catch((err) => console.error('[cron/pulse-auto-resolve] notify', err))
    }

    // Fire-and-forget: queue a case_study_draft for the founder to review.
    // The draft generator self-skips below the vote floor and is idempotent
    // per `pulse_market_id`, so a second cron run on a slow-resolving Pulse
    // won't spam blog_posts.
    void runCaseStudyDraft(row.id).catch((err) =>
      console.error('[cron/pulse-auto-resolve] case-study-draft', err)
    )

    resolved++
  }

  await cronHealthComplete(runId, JOB_NAME, admin, {
    success: errors.length === 0,
    summary: `checked=${list.length} resolved=${resolved}`,
    error: errors.length ? errors.map((e) => `${e.marketId}: ${e.message}`).join('; ') : undefined,
  })

  return NextResponse.json({
    ok: true,
    checked: list.length,
    resolved,
    errors: errors.length ? errors : undefined,
  })
}
