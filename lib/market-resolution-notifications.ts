import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildPulseResolutionPush,
  resolvePushLocale,
  sendPushToUser,
} from '@/lib/expo-push'
import { sendMarketResolutionEmail } from '@/lib/resend'
import { dispatchSponsorPulseClosureEmail } from '@/lib/sponsor-notifications'

export async function notifyMarketResolutionVoters(
  admin: SupabaseClient,
  params: { marketId: string; winningOutcomeId: string; winningLabel: string }
): Promise<void> {
  const { marketId, winningOutcomeId, winningLabel } = params

  // Pull the fields we need for both voter notifications and the
  // sponsor closure email in one round-trip.
  const { data: market } = await admin
    .from('prediction_markets')
    .select('title, is_pulse, sponsor_account_id')
    .eq('id', marketId)
    .single()

  const { data: votes } = await admin
    .from('market_votes')
    .select('user_id, outcome_id, is_correct, bonus_xp')
    .eq('market_id', marketId)

  const marketTitle = market?.title || 'Prediction'

  // Pulse-only sponsor closure email. Runs in parallel with (actually,
  // slightly before) the voter fan-out; wrapped as fire-and-forget so a
  // Resend failure can't stall the voter loop. Non-Pulse markets and
  // markets without a sponsor_account_id are silently skipped.
  if (market?.is_pulse && market.sponsor_account_id) {
    const totalVoters = (votes || []).filter((v) => !!v.user_id).length
    void dispatchSponsorPulseClosureEmail({
      sponsorAccountId: market.sponsor_account_id as string,
      marketId,
      marketTitle,
      winningLabel,
      totalVoters,
    }).catch((err) => console.warn('[market-resolution] sponsor closure email error:', err))
  }

  for (const v of votes || []) {
    if (!v.user_id) continue

    const won = v.outcome_id === winningOutcomeId
    const message = won
      ? `Your vote matched the community outcome.${v.bonus_xp ? ` +${v.bonus_xp} bonus XP.` : ''}`
      : `Community outcome: ${winningLabel}. Your vote was recorded.`
    try {
      await admin.from('notifications').insert({
        user_id: v.user_id,
        type: 'market_resolved',
        title: `Pulse closed: ${marketTitle}`,
        message: `"${marketTitle}" closed. ${message}`,
        link: `/predictions/markets/${marketId}`,
      })
    } catch (notifErr) {
      console.error('Notification insert error:', notifErr)
    }

    // Results push to the voter (audit P5; restored from dfdff0d). MUST be
    // awaited — fire-and-forget sends are dropped when the lambda freezes
    // (the b8cb7a4 lesson). sendPushToUser respects the user's push
    // opt-out and logs to push_log.
    if (market?.is_pulse) {
      try {
        const locale = await resolvePushLocale(admin, v.user_id)
        await sendPushToUser(
          admin,
          v.user_id,
          buildPulseResolutionPush({
            marketId,
            marketTitle,
            winningLabel,
            won,
            bonusXp: v.bonus_xp ?? 0,
            locale,
          })
        )
      } catch (pushErr) {
        console.warn('[market-resolution] expo push error:', pushErr)
      }
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('email, full_name')
      .eq('id', v.user_id)
      .single()
    if (profile?.email) {
      void sendMarketResolutionEmail(
        profile.email,
        profile.full_name || 'Predictor',
        marketTitle,
        winningLabel,
        won,
        v.bonus_xp ?? undefined
      ).catch((err) => console.error('Resolution email error:', err))
    }
  }
}
