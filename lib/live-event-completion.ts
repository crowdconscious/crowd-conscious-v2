import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchLeadingFundCause } from '@/lib/live-fund-leading-cause'
import { computeLiveEventLeaderboardRanks } from '@/lib/live-event-leaderboard-server'
import { sendLiveMatchResultsEmail } from '@/lib/live-event-emails'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app'

type LiveEventRow = {
  id: string
  title: string
  total_fund_impact: number | null
  total_votes_cast: number | null
}

/**
 * Fund snapshot + post-match emails (call only when status first becomes `completed`).
 */
export async function runLiveEventCompletedSideEffects(
  admin: SupabaseClient,
  event: LiveEventRow
): Promise<void> {
  const leading = await fetchLeadingFundCause(admin)
  await admin.from('live_event_fund_snapshots').upsert(
    {
      live_event_id: event.id,
      cause_id: leading?.id ?? null,
      cause_name: leading?.name ?? null,
      total_impact_usd: Number(event.total_fund_impact ?? 0),
      total_votes_cast: event.total_votes_cast ?? 0,
    },
    { onConflict: 'live_event_id' }
  )

  const ranks = await computeLiveEventLeaderboardRanks(admin, event.id)
  const rankByUser = new Map(ranks.map((r) => [r.user_id, r]))
  const userIds = ranks.map((r) => r.user_id)

  if (userIds.length === 0) {
    await admin
      .from('live_events')
      .update({ results_email_sent_at: new Date().toISOString() })
      .eq('id', event.id)
    return
  }

  const { data: profs } = await admin
    .from('profiles')
    .select('id, email, email_notifications')
    .in('id', userIds)

  for (const p of profs ?? []) {
    if (p.email_notifications === false) continue
    const email = (p.email as string | null)?.trim()
    if (!email) continue
    const r = rankByUser.get(p.id)
    if (!r) continue
    await sendLiveMatchResultsEmail(email, {
      eventTitle: event.title,
      rank: r.rank,
      totalXp: r.total_xp,
      correctCount: r.correct_count,
      voteCount: r.vote_count,
      resultsUrl: `${APP_URL}/live/${event.id}`,
      locale: 'en',
    })
    await new Promise((res) => setTimeout(res, 60))
  }

  await admin
    .from('live_events')
    .update({ results_email_sent_at: new Date().toISOString() })
    .eq('id', event.id)
}
