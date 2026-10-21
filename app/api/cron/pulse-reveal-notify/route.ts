import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { cronHealthCheck, cronHealthComplete } from '@/lib/cron-health'
import { resolvePushLocale, sendPushToUser } from '@/lib/expo-push'
import {
  buildPulseRevealReadyPush,
  isRevealReady,
  type RevealNotifyMarket,
} from '@/lib/pulse/reveal-notify-copy'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

const JOB_NAME = 'pulse-reveal-notify'
const MARKET_BATCH = 200
const SUB_BATCH = 500

/**
 * "Avísame" (migration 297): early voters subscribed via the mobile reveal
 * sheet get one push once the Pulse reaches PARTICIPATION_REVEAL_THRESHOLD
 * or closes. Idempotent: rows are claimed by setting notified_at
 * (WHERE notified_at IS NULL ... RETURNING) before sending, so overlapping
 * runs never double-send.
 *
 * Auth: Bearer `process.env.CRON_SECRET` (mirrors push-receipts).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { runId } = await cronHealthCheck(JOB_NAME, admin)
  const errors: string[] = []
  let readyMarkets = 0
  let notified = 0

  try {
    const { data: pending, error: pendingErr } = await admin
      .from('pulse_reveal_subscriptions')
      .select('market_id')
      .is('notified_at', null)
      .limit(SUB_BATCH)
    if (pendingErr) throw new Error(`pending: ${pendingErr.message}`)

    const marketIds = [...new Set((pending ?? []).map((r) => r.market_id as string))].slice(
      0,
      MARKET_BATCH
    )

    if (marketIds.length > 0) {
      const { data: markets, error: mErr } = await admin
        .from('prediction_markets')
        .select('id, title, status, total_votes, resolution_date')
        .in('id', marketIds)
      if (mErr) throw new Error(`markets: ${mErr.message}`)

      const ready = ((markets ?? []) as RevealNotifyMarket[]).filter((m) => isRevealReady(m))
      readyMarkets = ready.length

      for (const market of ready) {
        const { data: claimed, error: cErr } = await admin
          .from('pulse_reveal_subscriptions')
          .update({ notified_at: new Date().toISOString() })
          .eq('market_id', market.id)
          .is('notified_at', null)
          .select('user_id')
        if (cErr) {
          errors.push(`claim ${market.id}: ${cErr.message}`)
          continue
        }
        for (const row of claimed ?? []) {
          const userId = row.user_id as string
          try {
            const locale = await resolvePushLocale(admin, userId)
            await sendPushToUser(
              admin,
              userId,
              buildPulseRevealReadyPush({
                marketId: market.id,
                marketTitle: market.title,
                locale,
              })
            )
            notified++
          } catch (err) {
            errors.push(`send ${userId}: ${err instanceof Error ? err.message : String(err)}`)
          }
        }
      }
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err))
  }

  await cronHealthComplete(runId, JOB_NAME, admin, {
    success: errors.length === 0,
    summary: `ready_markets=${readyMarkets} notified=${notified}`,
    error: errors.length ? errors.join('; ') : undefined,
  })

  return NextResponse.json({
    ok: errors.length === 0,
    ready_markets: readyMarkets,
    notified,
    errors: errors.length ? errors : undefined,
  })
}
