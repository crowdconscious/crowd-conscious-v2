import type { SupabaseClient } from '@supabase/supabase-js'
import { sendMarketResolutionEmail } from '@/lib/resend'

export async function notifyMarketResolutionVoters(
  admin: SupabaseClient,
  params: { marketId: string; winningOutcomeId: string; winningLabel: string }
): Promise<void> {
  const { marketId, winningOutcomeId, winningLabel } = params

  const { data: market } = await admin
    .from('prediction_markets')
    .select('title')
    .eq('id', marketId)
    .single()

  const { data: votes } = await admin
    .from('market_votes')
    .select('user_id, outcome_id, is_correct, bonus_xp')
    .eq('market_id', marketId)

  const marketTitle = market?.title || 'Prediction'

  for (const v of votes || []) {
    if (!v.user_id) continue

    const won = v.outcome_id === winningOutcomeId
    const message = won
      ? `Correct! You earned ${v.bonus_xp ?? 0} bonus XP.`
      : `The market resolved as ${winningLabel}.`
    try {
      await admin.from('notifications').insert({
        user_id: v.user_id,
        type: 'market_resolved',
        title: `Market resolved: ${marketTitle}`,
        message: `"${marketTitle}" resolved as ${winningLabel}. ${message}`,
        link: `/predictions/markets/${marketId}`,
      })
    } catch (notifErr) {
      console.error('Notification insert error:', notifErr)
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('email, full_name')
      .eq('id', v.user_id)
      .single()
    if (profile?.email) {
      sendMarketResolutionEmail(
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
